import {
    error,
    HttpError,
    HttpStatus,
    Result,
    ResultError,
    success,
} from "app";
import ExcelJs from "exceljs";
import { FilterQuery, PipelineStage, ProjectionFields } from "mongoose";
import { parseQuery, parseSort, ParseSyntaxError } from "mquery";
import { equal } from "utils";
import {
    exportPdf,
    exportSLAPdf,
    getTicketWorkbook,
    getTicketWorkbookForSLA,
} from "..";
import { ITicket } from "../../interfaces/models";
import {
    ExportTicketReqQuery,
    ExportTicketSLAReqQuery,
    FindTicketWithAdvancedFilterReqQuery,
} from "../../interfaces/request";
import { RoleType } from "../../interfaces/response";
import { Ticket } from "../../models";
import {
    calculateSlaForTicket,
    findRoleByIds,
    findUser,
    getGroupIdsByUserId,
    getTicketNotConnectIncident,
} from "../../service";
import { getPossibleStatus, transformTemplate } from "../common.controller";
import { getFileAttachments } from "./common.ticket";

function toDate(
    dateString: string,
    hours?: string,
    minutes?: string,
    seconds?: string
): Date {
    const parts = dateString.split("-");
    const date = parts[0];
    const monthIndex = parts[1];
    const year = parts[2];
    return new Date(
        `${year}-${monthIndex}-${date}T${hours}:${minutes}:${seconds}Z`
    );
}

export async function findTicketWithAdvancedFilter(
    params: FindTicketWithAdvancedFilterReqQuery & {
        ticketId?: string;
        userRoles: string[];
        userTenant?: string;
        userId: string;
    }
): Promise<Result> {
    const pipeline: PipelineStage[] = [];
    let match: undefined | FilterQuery<ITicket> = {
        tenant: params.userTenant,
    };
    let user_filter: undefined | FilterQuery<ITicket> = undefined;
    let sort: undefined | Record<string, 1 | -1> = undefined;
    try {
        user_filter = params.query ? parseQuery(params.query) : undefined;
        sort = params.sort ? parseSort(params.sort) : undefined;
    } catch (e) {
        const err = e as unknown as ParseSyntaxError;
        const errorValue =
            err.message === params.sort ? params.sort : params.query;
        throw new HttpError(
            error.invalidData({
                location: "query",
                param: err.type,
                message: err.message,
                value: errorValue,
            })
        );
    }
    user_filter ? (match = { ...match, ...user_filter }) : undefined;
    if (params.start && params.end && params.type) {
        const startDate = toDate(params.start, "00", "00", "00");
        const endDate = toDate(params.end, "23", "59", "59");
        const created_time_condition = {
            $and: [
                { created_time: { $gte: startDate } },
                { created_time: { $lte: endDate } },
            ],
        };
        const overdue_time_condition = {
            $and: [
                { overdue_time: { $gte: startDate } },
                { overdue_time: { $lte: endDate } },
            ],
        };
        if (params.type === "created_time") {
            match = { ...match, ...created_time_condition };
        }
        if (params.type === "overdue_time") {
            match = {
                ...match,
                ...overdue_time_condition,
            };
        }
    }

    if (params.userTenant) {
        const [getGroupIds, response] = await Promise.all([
            getGroupIdsByUserId({
                userId: params.userId,
            }),
            findRoleByIds(params.userRoles, params.userTenant),
        ]);
        if (response.status === HttpStatus.OK) {
            const roles = response.body;
            if (roles && roles.length > 0) {
                const isView = roles.some(
                    (role) => role.request_permission.view
                );
                const isCustomer = roles.some(
                    (role) =>
                        role.type.includes(RoleType.CUSTOMER) ||
                        (role.type === RoleType.DEFAULT && role.id === "EU")
                );
                const isEmployee = roles.some(
                    (role) =>
                        role.type.includes(RoleType.EMPLOYEE) ||
                        (role.type.includes(RoleType.DEFAULT) &&
                            (role.id === "L1" || role.id === "L2"))
                );
                const isTA = roles.some(
                    (role) =>
                        role.type.includes(RoleType.DEFAULT) && role.id === "TA"
                );
                const isTechnician = roles.some(
                    (role) =>
                        !role.advanced_view_permission.all_ticket &&
                        !role.advanced_view_permission.group_ticket &&
                        role.advanced_view_permission.technician_ticket
                );
                const isGroup = roles.some(
                    (role) =>
                        !role.advanced_view_permission.all_ticket &&
                        role.advanced_view_permission.group_ticket
                );
                const isAll = roles.some(
                    (role) => role.advanced_view_permission.all_ticket
                );
                if (isView) {
                    if (isCustomer && !isEmployee && !isTA) {
                        match = {
                            ...match,
                            $or: [
                                {
                                    "creator.id": params.userId,
                                },
                                {
                                    "requester.id": params.userId,
                                },
                            ],
                        };
                    }
                    if (isEmployee && !isTA) {
                        if (isTechnician && !isGroup && !isAll) {
                            match = {
                                ...match,
                                $or: [
                                    {
                                        "technician.id": params.userId,
                                    },
                                ],
                            };
                        }
                        if (isGroup && !isAll) {
                            match = {
                                ...match,
                                $or: [
                                    {
                                        "group.id": { $in: getGroupIds },
                                    },
                                ],
                            };
                        }
                    }
                }
            }
        }
    }

    if (typeof params.sla === "boolean") {
        match = match
            ? {
                  ...match,

                  "sla.is_active": {
                      $eq: params.sla,
                  },
              }
            : {
                  "sla.is_active": {
                      $eq: params.sla,
                  },
              };
    }

    if (params.departments && params.departments.length > 0) {
        match = match
            ? {
                  ...match,

                  "requester.department.id": {
                      $in: params.departments,
                  },
              }
            : {
                  "requester.department.id": {
                      $in: params.departments,
                  },
              };
    }
    if (params.requesters && params.requesters.length > 0) {
        match = match
            ? {
                  ...match,

                  "requester.id": {
                      $in: params.requesters,
                  },
              }
            : {
                  "requester.id": {
                      $in: params.requesters,
                  },
              };
    }
    if (params.services && params.services.length > 0) {
        match = match
            ? {
                  ...match,

                  "service.id": {
                      $in: params.services,
                  },
              }
            : {
                  "service.id": {
                      $in: params.services,
                  },
              };
    }
    if (params.types && params.types.length > 0) {
        match = match
            ? {
                  ...match,

                  "type.id": {
                      $in: params.types,
                  },
              }
            : {
                  "type.id": {
                      $in: params.types,
                  },
              };
    }
    if (params.priorities && params.priorities.length > 0) {
        match = match
            ? {
                  ...match,

                  "priority.id": {
                      $in: params.priorities,
                  },
              }
            : {
                  "priority.id": {
                      $in: params.priorities,
                  },
              };
    }
    if (params.groups && params.groups.length > 0) {
        match = match
            ? {
                  ...match,

                  "group.id": {
                      $in: params.groups,
                  },
              }
            : {
                  "group.id": {
                      $in: params.groups,
                  },
              };
    }
    if (params.technicians && params.technicians.length > 0) {
        match = match
            ? {
                  ...match,

                  "technician.id": {
                      $in: params.technicians,
                  },
              }
            : {
                  "technician.id": {
                      $in: params.technicians,
                  },
              };
    }
    if (typeof params.response_assurance === "boolean") {
        match = match
            ? {
                  ...match,

                  "sla.response_assurance.is_overdue": {
                      $eq: params.response_assurance,
                  },
              }
            : {
                  "sla.response_assurance.is_overdue": {
                      $in: params.response_assurance,
                  },
              };
    }
    if (typeof params.resolving_assurance === "boolean") {
        match = match
            ? {
                  ...match,

                  "sla.resolving_assurance.is_overdue": {
                      $eq: params.resolving_assurance,
                  },
              }
            : {
                  "sla.resolving_assurance.is_overdue": {
                      $in: params.resolving_assurance,
                  },
              };
    }
    match ? pipeline.push({ $match: match }) : null;
    const project = {
        _id: 0,
        id: 1,
        name: 1,
        number: 1,
        description: 1,
        created_time: 1,
        creator: "$creator.fullname",
        requester: 1,
        status: "$status.name",
        type: "$type.name",
        channel: "$channel.name",
        group: "$group.name",
        technician: "$technician.fullname",
        priority: "$priority.name",
        service: "$service.name",
        sub_service: "$sub_service.name",
        overdue_time: 1,
        sla: 1,
        closed_time: 1,
    };
    const facet = {
        meta: [{ $count: "total" }],
        data: [
            { $skip: params.size * params.page },
            { $limit: params.size * 1 },
        ],
    };
    pipeline.push(
        { $project: project },
        { $sort: { ...sort, number: -1 } },
        { $facet: facet }
    );
    const result = await Ticket.aggregate(pipeline)
        .collation({ locale: "vi", numericOrdering: true })
        .allowDiskUse(true)
        .then((res) => res[0])
        .then((res) => {
            const total = !(res.meta.length > 0) ? 0 : res.meta[0].total;
            return {
                page: Number(params.page),
                total: total,
                total_page: Math.ceil(total / params.size),
                data: res.data,
            };
        });
    return success.ok(result);
}

export async function findTicket(params: {
    query?: string;
    sort?: string;
    size: number;
    page: number;
    start?: string;
    end?: string;
    type?: string;
    ticketId?: string;
    userRoles: string[];
    userTenant?: string;
    userId: string;
}): Promise<Result> {
    const pipeline: PipelineStage[] = [];
    let match: undefined | FilterQuery<ITicket> = undefined;
    let user_filter: undefined | FilterQuery<ITicket> = undefined;
    let sort: undefined | Record<string, 1 | -1> = undefined;
    try {
        // match = params.query ? parseQuery(params.query) : undefined;
        user_filter = params.query ? parseQuery(params.query) : undefined;
        sort = params.sort ? parseSort(params.sort) : undefined;
    } catch (e) {
        const err = e as unknown as ParseSyntaxError;
        const errorValue =
            err.message === params.sort ? params.sort : params.query;
        throw new HttpError(
            error.invalidData({
                location: "query",
                param: err.type,
                message: err.message,
                value: errorValue,
            })
        );
    }

    const getGroupIds = await getGroupIdsByUserId({
        userId: params.userId,
    });

    if (params.userTenant) {
        const response = await findRoleByIds(
            params.userRoles,
            params.userTenant
        );
        if (response.status === HttpStatus.OK) {
            const roles = response.body;
            if (roles && roles.length > 0) {
                const isView = roles.some(
                    (role) => role.request_permission.view
                );
                const isCustomer = roles.some(
                    (role) =>
                        role.type.includes(RoleType.CUSTOMER) ||
                        (role.type === RoleType.DEFAULT && role.id === "EU")
                );
                const isEmployee = roles.some(
                    (role) =>
                        role.type.includes(RoleType.EMPLOYEE) ||
                        (role.type.includes(RoleType.DEFAULT) &&
                            (role.id === "L1" || role.id === "L2"))
                );
                const isTA = roles.some(
                    (role) =>
                        role.type.includes(RoleType.DEFAULT) && role.id === "TA"
                );
                const isTechnician = roles.some(
                    (role) =>
                        !role.advanced_view_permission.all_ticket &&
                        !role.advanced_view_permission.group_ticket &&
                        role.advanced_view_permission.technician_ticket
                );
                const isGroup = roles.some(
                    (role) =>
                        !role.advanced_view_permission.all_ticket &&
                        role.advanced_view_permission.group_ticket
                );
                const isAll = roles.some(
                    (role) => role.advanced_view_permission.all_ticket
                );
                if (isView) {
                    if (isCustomer && !isEmployee && !isTA) {
                        match = {
                            $or: [
                                {
                                    "creator.id": params.userId,
                                },
                                {
                                    "requester.id": params.userId,
                                },
                            ],
                        };
                    }
                    if (isEmployee && !isTA) {
                        if (isTechnician && !isGroup && !isAll) {
                            match = {
                                ...match,
                                $or: [
                                    {
                                        "technician.id": params.userId,
                                    },
                                ],
                            };
                        }
                        if (isGroup && !isAll) {
                            match = {
                                ...match,
                                $or: [
                                    {
                                        "group.id": { $in: getGroupIds },
                                    },
                                ],
                            };
                        }
                    }
                }
            }
        }
    }

    let startDate: Date;
    let endDate: Date;
    if (params.start && params.end) {
        startDate = toDate(params.start, "00", "00", "00");
        endDate = toDate(params.end, "23", "59", "59");

        params.type === "created_time"
            ? (match = {
                  ...match,
                  $and: [
                      { created_time: { $gte: startDate } },
                      { created_time: { $lte: endDate } },
                  ],
              })
            : params.type === "overdue_time"
            ? (match = {
                  ...match,
                  $and: [
                      { overdue_time: { $gte: startDate } },
                      { overdue_time: { $lte: endDate } },
                  ],
              })
            : null;
    }

    if (params.userTenant) {
        const tenantCondition = {
            tenant: params.userTenant,
        };
        match = match
            ? {
                  $and: [match, tenantCondition],
              }
            : tenantCondition;
    }
    match = {
        ...match,
        // GiangND17 disable
        // "connect.requests": {
        //     $elemMatch: {
        //         $nin: [params.ticketId],
        //     },
        // },
    };
    match ? pipeline.push({ $match: match }) : null;
    const project: ProjectionFields<ITicket> = {
        _id: 0,
        id: 1,
        name: 1,
        number: 1,
        type: "$type.name",
        department: "$requester.department.name",
        status: "$status.name",
        priority: "$priority.name",
        service: "$service.name",
        group: "$group.name",
        created_time: 1,
        overdue_time: 1,
        requester: "$requester.fullname",
        technician: "$technician.fullname",
    };
    const facet = {
        meta: [{ $count: "total" }],
        data: [
            { $skip: params.size * params.page },
            { $limit: params.size * 1 },
        ],
    };
    // sort ? pipeline.push({ $sort: sort }) : null;
    pipeline.push(
        { $project: project },
        { $match: user_filter ?? {} },
        { $sort: { ...(sort ? sort : { number: -1 }) } },
        { $facet: facet }
    );
    const result = await Ticket.aggregate(pipeline)
        .collation({ locale: "vi", numericOrdering: true })
        .allowDiskUse(true)
        .then((res) => res[0])
        .then((res) => {
            const total = !(res.meta.length > 0) ? 0 : res.meta[0].total;
            return {
                page: Number(params.page),
                total: total,
                total_page: Math.ceil(total / params.size),
                data: res.data,
            };
        });
    return success.ok(result);
}

export async function getTicketById(params: {
    ticketId: string;
    tenant?: string;
    userRoles: string[];
    userId: string;
}): Promise<Result> {
    let match: FilterQuery<ITicket> = {};
    const getGroupIds = await getGroupIdsByUserId({
        userId: params.userId,
    });

    if (params.tenant) {
        const response = await findRoleByIds(params.userRoles, params.tenant);
        if (response.status === HttpStatus.OK) {
            const roles = response.body;
            if (roles && roles.length > 0) {
                const isView = roles.some(
                    (role) => role.request_permission.view
                );
                const isCustomer = roles.some(
                    (role) =>
                        role.type.includes(RoleType.CUSTOMER) ||
                        (role.type === RoleType.DEFAULT && role.id === "EU")
                );
                const isEmployee = roles.some(
                    (role) =>
                        role.type.includes(RoleType.EMPLOYEE) ||
                        (role.type.includes(RoleType.DEFAULT) &&
                            (role.id === "L1" || role.id === "L2"))
                );
                const isTA = roles.some(
                    (role) =>
                        role.type.includes(RoleType.DEFAULT) && role.id === "TA"
                );
                const isTechnician = roles.some(
                    (role) =>
                        !role.advanced_view_permission.all_ticket &&
                        !role.advanced_view_permission.group_ticket &&
                        role.advanced_view_permission.technician_ticket
                );
                const isGroup = roles.some(
                    (role) =>
                        !role.advanced_view_permission.all_ticket &&
                        role.advanced_view_permission.group_ticket
                );
                const isAll = roles.some(
                    (role) => role.advanced_view_permission.all_ticket
                );
                if (isView) {
                    if (isCustomer && !isEmployee && !isTA) {
                        match = {
                            ...match,
                            $or: [
                                {
                                    "creator.id": params.userId,
                                },
                                {
                                    "requester.id": params.userId,
                                },
                            ],
                        };
                    }
                    if (isEmployee && !isTA) {
                        if (isTechnician && !isGroup && !isAll) {
                            match = {
                                ...match,
                                $or: [
                                    {
                                        "technician.id": params.userId,
                                    },
                                ],
                            };
                        }
                        if (isGroup && !isAll) {
                            match = {
                                ...match,
                                $or: [
                                    {
                                        "group.id": { $in: getGroupIds },
                                    },
                                ],
                            };
                        }
                    }
                    match = {
                        ...match,
                        $and: [
                            {
                                id: params.ticketId,
                            },
                        ],
                    };
                }
            }
        }
    }
    params.userRoles.includes("EU")
        ? (match = {
              $and: [
                  {
                      $or: [
                          { "requester.id": params.userId },
                          { "creator.id": params.userId },
                      ],
                  },
                  { id: params.ticketId },
              ],
          })
        : (match = { id: params.ticketId });

    params.tenant ? (match.tenant = params.tenant) : null;
    const ticket = await Ticket.findOne(match, { _id: 0 })?.lean();
    if (!ticket) {
        const resultError = error.actionNotAllowed();
        throw new HttpError(resultError);
    }

    ticket.workflow.nodes.map((node) => {
        const statusDescription = node.status?.description;
        if (statusDescription) {
            const data = {
                tooltip: `<div><p>${statusDescription}</p></div>`,
            };
            Object.assign(node, data);
        }
    });

    if (ticket.connect) {
        let request = 0;
        let incident = 0;
        request = ticket.connect.requests ? ticket.connect.requests.length : 0;
        incident = ticket.connect.incidents
            ? ticket.connect.incidents.length
            : 0;
        Object.assign(ticket, {
            connect: {
                requests: request,
                incidents: incident,
            },
        });
    }

    const [possibleStatus, attachments, calculatedSlaRes] = await Promise.all([
        getPossibleStatus(ticket.workflow, ticket.status?.id),
        getFileAttachments(ticket.attachments),
        ticket.sla ? calculateSlaForTicket(ticket) : undefined,
    ]);
    if (ticket.sla && calculatedSlaRes && calculatedSlaRes.body) {
        Object.assign(ticket.sla, calculatedSlaRes.body);
    }
    const next_status = possibleStatus.filter(
        (s) => s.id !== ticket.status?.id
    );
    const isEU = params.userRoles[equal](["EU"]);
    const transformOutput = transformTemplate({
        template: ticket.template,
        resourceId: ticket.id,
        isEndUser: isEU,
    });
    return success.ok({
        ...ticket,
        ...transformOutput,
        attachments,
        next_status,
    });
}

export async function getRawTicketById(id: string): Promise<Result> {
    const ticket = await Ticket.findOne({ id }, { _id: 0 }).lean();
    if (!ticket) {
        return error.notFound({
            location: "param",
            value: id,
            message: `the ticket does not exist`,
        });
    }
    return success.ok(ticket);
}

export async function getMyTickets(params: {
    userTenant: string;
    userRoles: string[];
    userId: string;
}): Promise<Result> {
    const pipeline: PipelineStage[] = [];
    const match: FilterQuery<ITicket> = {};

    if (params.userTenant) {
        match.tenant = params.userTenant;
        const response = await findRoleByIds(
            params.userRoles,
            params.userTenant
        );
        if (response.status === HttpStatus.OK) {
            const roles = response.body;
            if (roles && roles.length > 0) {
                const isView = roles.some(
                    (role) => role.request_permission.view
                );
                const isEmployee = roles.some(
                    (role) =>
                        role.type.includes(RoleType.EMPLOYEE) ||
                        (role.type.includes(RoleType.DEFAULT) &&
                            (role.id === "L1" || role.id === "L2"))
                );
                const isTA = roles.some(
                    (role) =>
                        role.type.includes(RoleType.DEFAULT) && role.id === "TA"
                );
                if (isView) {
                    if (isEmployee || isTA) {
                        match.$and = [
                            {
                                $or: [
                                    {
                                        "technician.id": params.userId,
                                    },
                                ],
                            },
                        ];
                    } else {
                        match.$and = [
                            {
                                $or: [
                                    {
                                        "requester.id": "$#$",
                                    },
                                ],
                            },
                        ];
                    }
                } else {
                    match.$and = [
                        {
                            $or: [
                                {
                                    "requester.id": "$#$",
                                },
                            ],
                        },
                    ];
                }
            }
        }
    }

    const group = {
        _id: "$status.id",
        id: { $first: "$status.id" },
        name: { $first: "$status.name" },
        description: { $first: "$status.description" },
        count: { $sum: 1 },
    };
    pipeline.push(
        { $match: match },
        { $group: group },
        { $project: { _id: 0 } }
    );
    const result = await Ticket.aggregate(pipeline);
    return success.ok(result);
}

export async function getTicketStatisticByStatus(params: {
    userTenant: string;
    userRoles: string[];
    userId: string;
    start?: string;
    end?: string;
}): Promise<Result> {
    const pipeline: PipelineStage[] = [];
    const match: FilterQuery<ITicket> = {};
    const getGroupIds = await getGroupIdsByUserId({
        userId: params.userId,
    });

    let startDate: Date;
    let endDate: Date;
    if (params.start && params.end) {
        startDate = toDate(params.start, "00", "00", "00");
        endDate = toDate(params.end, "23", "59", "59");

        match.created_time = {
            $gte: startDate,
            $lte: endDate,
        };
    }

    if (params.userTenant) {
        match.tenant = params.userTenant;
        const response = await findRoleByIds(
            params.userRoles,
            params.userTenant
        );
        if (response.status === HttpStatus.OK) {
            const roles = response.body;
            if (roles && roles.length > 0) {
                const isView = roles.some(
                    (role) => role.request_permission.view
                );
                const isCustomer = roles.some(
                    (role) =>
                        role.type.includes(RoleType.CUSTOMER) ||
                        (role.type === RoleType.DEFAULT && role.id === "EU")
                );
                const isEmployee = roles.some(
                    (role) =>
                        role.type.includes(RoleType.EMPLOYEE) ||
                        (role.type.includes(RoleType.DEFAULT) &&
                            (role.id === "L1" || role.id === "L2"))
                );
                const isTA = roles.some(
                    (role) =>
                        role.type.includes(RoleType.DEFAULT) && role.id === "TA"
                );
                const isTechnician = roles.some(
                    (role) =>
                        !role.advanced_view_permission.all_ticket &&
                        !role.advanced_view_permission.group_ticket &&
                        role.advanced_view_permission.technician_ticket
                );
                const isGroup = roles.some(
                    (role) =>
                        !role.advanced_view_permission.all_ticket &&
                        role.advanced_view_permission.group_ticket
                );
                const isAll = roles.some(
                    (role) => role.advanced_view_permission.all_ticket
                );
                if (isView) {
                    if (isCustomer && !isEmployee && !isTA) {
                        match.$and = [
                            {
                                $or: [
                                    { "requester.id": params.userId },
                                    { "creator.id": params.userId },
                                ],
                            },
                        ];
                    }
                    if (isEmployee && !isTA) {
                        if (isTechnician && !isGroup && !isAll) {
                            match.$and = [
                                {
                                    $or: [
                                        {
                                            "technician.id": params.userId,
                                        },
                                    ],
                                },
                            ];
                        }
                        if (isGroup && !isAll) {
                            match.$and = [
                                {
                                    $or: [
                                        {
                                            "group.id": { $in: getGroupIds },
                                        },
                                    ],
                                },
                            ];
                        }
                    }
                }
            }
        }
    }
    const group = {
        _id: "$status.id",
        id: { $first: "$status.id" },
        name: { $first: "$status.name" },
        description: { $first: "$status.description" },
        count: { $sum: 1 },
    };
    pipeline.push(
        { $match: match },
        { $group: group },
        { $project: { _id: 0 } }
    );
    const result = await Ticket.aggregate(pipeline);
    return success.ok({
        data: result,
    });
}

export async function getTicketStatisticByDate(params: {
    start?: string;
    end?: string;
    userRoles: string[];
    userTenant?: string;
    userId: string;
}): Promise<Result> {
    const pipeline: PipelineStage[] = [];
    let match: FilterQuery<ITicket> = {};
    const getGroupIds = await getGroupIdsByUserId({
        userId: params.userId,
    });

    let startDate: Date;
    let endDate: Date;
    if (params.start && params.end) {
        startDate = toDate(params.start, "00", "00", "00");
        endDate = toDate(params.end, "23", "59", "59");

        match.created_time = {
            $gte: startDate,
            $lte: endDate,
        };
    }
    if (params.userTenant) {
        match.tenant = params.userTenant;
        const response = await findRoleByIds(
            params.userRoles,
            params.userTenant
        );
        if (response.status === HttpStatus.OK) {
            const roles = response.body;
            if (roles && roles.length > 0) {
                const isView = roles.some(
                    (role) => role.request_permission.view
                );
                const isCustomer = roles.some(
                    (role) =>
                        role.type.includes(RoleType.CUSTOMER) ||
                        (role.type === RoleType.DEFAULT && role.id === "EU")
                );
                const isEmployee = roles.some(
                    (role) =>
                        role.type.includes(RoleType.EMPLOYEE) ||
                        (role.type.includes(RoleType.DEFAULT) &&
                            (role.id === "L1" || role.id === "L2"))
                );
                const isTA = roles.some(
                    (role) =>
                        role.type.includes(RoleType.DEFAULT) && role.id === "TA"
                );
                const isTechnician = roles.some(
                    (role) =>
                        !role.advanced_view_permission.all_ticket &&
                        !role.advanced_view_permission.group_ticket &&
                        role.advanced_view_permission.technician_ticket
                );
                const isGroup = roles.some(
                    (role) =>
                        !role.advanced_view_permission.all_ticket &&
                        role.advanced_view_permission.group_ticket
                );
                const isAll = roles.some(
                    (role) => role.advanced_view_permission.all_ticket
                );
                if (isView) {
                    if (isCustomer && !isEmployee && !isTA) {
                        match = {
                            $or: [
                                {
                                    "creator.id": params.userId,
                                },
                                {
                                    "requester.id": params.userId,
                                },
                            ],
                        };
                    }
                    if (isEmployee && !isTA) {
                        if (isTechnician && !isGroup && !isAll) {
                            match = {
                                ...match,
                                $or: [
                                    {
                                        "technician.id": params.userId,
                                    },
                                ],
                            };
                        }
                        if (isGroup && !isAll) {
                            match = {
                                ...match,
                                $or: [
                                    {
                                        "group.id": { $in: getGroupIds },
                                    },
                                ],
                            };
                        }
                    }
                }
            }
        }
    }

    const group = {
        _id: {
            month: {
                $month: "$created_time",
            },
            day: {
                $dayOfMonth: "$created_time",
            },
            year: {
                $year: "$created_time",
            },
            formattedDateString: {
                $dateToString: {
                    format: "%Y-%m-%d",
                    date: "$created_time",
                },
            },
        },
        date: {
            $first: {
                $dateToString: {
                    format: "%Y-%m-%d",
                    date: "$created_time",
                },
            },
        },
        count: { $sum: 1 },
    };
    pipeline.push(
        { $match: match },
        { $group: group },
        { $project: { _id: 0 } },
        { $sort: { date: 1 } }
    );
    const result = await Ticket.aggregate(pipeline);
    const total = result.reduce((total, item) => total + item.count, 0);
    return success.ok({
        total,
        data: result,
    });
}

export async function getTicketStatisticByDepartment(params: {
    start?: string;
    end?: string;
    startPrew?: string;
    endPrew?: string;
    userRoles: string[];
    userTenant?: string;
    userId: string;
}): Promise<Result> {
    const pipeline: PipelineStage[] = [];
    const pipelinePrew: PipelineStage[] = [];
    let match: FilterQuery<ITicket> = {
        status: { $ne: null },
    };
    let matchPrew: FilterQuery<ITicket> = {
        status: { $ne: null },
    };
    const getGroupIds = await getGroupIdsByUserId({
        userId: params.userId,
    });

    let startDate: Date;
    let endDate: Date;
    if (params.start && params.end) {
        startDate = toDate(params.start, "00", "00", "00");
        endDate = toDate(params.end, "23", "59", "59");

        match.created_time = {
            $gte: startDate,
            $lte: endDate,
        };
    }

    let startDatePrew: Date;
    let endDatePrew: Date;
    if (params.startPrew && params.endPrew) {
        startDatePrew = toDate(params.startPrew, "00", "00", "00");
        endDatePrew = toDate(params.endPrew, "23", "59", "59");

        matchPrew.created_time = {
            $gte: startDatePrew,
            $lte: endDatePrew,
        };
    }

    if (params.userTenant) {
        match.tenant = params.userTenant;
        matchPrew.tenant = params.userTenant;
        const response = await findRoleByIds(
            params.userRoles,
            params.userTenant
        );
        if (response.status === HttpStatus.OK) {
            const roles = response.body;
            if (roles && roles.length > 0) {
                const isView = roles.some(
                    (role) => role.request_permission.view
                );
                const isCustomer = roles.some(
                    (role) =>
                        role.type.includes(RoleType.CUSTOMER) ||
                        (role.type === RoleType.DEFAULT && role.id === "EU")
                );
                const isEmployee = roles.some(
                    (role) =>
                        role.type.includes(RoleType.EMPLOYEE) ||
                        (role.type.includes(RoleType.DEFAULT) &&
                            (role.id === "L1" || role.id === "L2"))
                );
                const isTA = roles.some(
                    (role) =>
                        role.type.includes(RoleType.DEFAULT) && role.id === "TA"
                );
                const isTechnician = roles.some(
                    (role) =>
                        !role.advanced_view_permission.all_ticket &&
                        !role.advanced_view_permission.group_ticket &&
                        role.advanced_view_permission.technician_ticket
                );
                const isGroup = roles.some(
                    (role) =>
                        !role.advanced_view_permission.all_ticket &&
                        role.advanced_view_permission.group_ticket
                );
                const isAll = roles.some(
                    (role) => role.advanced_view_permission.all_ticket
                );
                if (isView) {
                    if (isCustomer && !isEmployee && !isTA) {
                        match = {
                            $or: [
                                {
                                    "creator.id": params.userId,
                                },
                                {
                                    "requester.id": params.userId,
                                },
                            ],
                        };
                        matchPrew = {
                            $or: [
                                {
                                    "creator.id": params.userId,
                                },
                                {
                                    "requester.id": params.userId,
                                },
                            ],
                        };
                    }
                    if (isEmployee && !isTA) {
                        if (isTechnician && !isGroup && !isAll) {
                            match = {
                                ...match,
                                $or: [
                                    {
                                        "technician.id": params.userId,
                                    },
                                ],
                            };
                            matchPrew = {
                                ...matchPrew,
                                $or: [
                                    {
                                        "technician.id": params.userId,
                                    },
                                ],
                            };
                        }
                        if (isGroup && !isAll) {
                            match = {
                                ...match,
                                $or: [
                                    {
                                        "group.id": { $in: getGroupIds },
                                    },
                                ],
                            };
                            matchPrew = {
                                ...matchPrew,
                                $or: [
                                    {
                                        "group.id": { $in: getGroupIds },
                                    },
                                ],
                            };
                        }
                    }
                }
            }
        }
    }
    const group = {
        _id: "$requester.department.id",
        id: {
            $first: "$requester.department.id",
        },
        name: {
            $first: "$requester.department.name",
        },
        count: { $sum: 1 },
    };
    pipeline.push(
        { $match: match },
        { $group: group },
        { $project: { _id: 0 } },
        { $sort: { count: -1 } }
    );
    pipelinePrew.push(
        { $match: matchPrew },
        { $group: group },
        { $project: { _id: 0 } },
        { $sort: { count: -1 } }
    );

    const resultNow = (await Ticket.aggregate(pipeline)).filter(
        (item) => item.id !== null
    );
    const resultPrew = (await Ticket.aggregate(pipelinePrew)).filter(
        (item) => item.id !== null
    );

    const result = resultNow.map((item) => {
        const prewItem = resultPrew.find((prewItem) => prewItem.id === item.id);
        if (prewItem && prewItem.count > 0) {
            return {
                ...item,
                scale: Math.abs(
                    ((item.count - prewItem.count) / prewItem.count) * 100
                ).toFixed(1),
                arrow: item.count >= prewItem.count ? "up" : "down",
            };
        } else {
            return {
                ...item,
                scale: null,
                arrow: null,
            };
        }
    });
    return success.ok({
        total: result.length,
        data: result,
    });
}

export async function getTicketStatisticByTechnician(params: {
    start?: string;
    end?: string;
    startPrew?: string;
    endPrew?: string;
    userRoles: string[];
    userTenant?: string;
    userId: string;
}): Promise<Result> {
    const pipeline: PipelineStage[] = [];
    const pipelinePrew: PipelineStage[] = [];
    let match: FilterQuery<ITicket> = {
        status: { $ne: null },
    };
    let matchPrew: FilterQuery<ITicket> = {
        status: { $ne: null },
    };
    const getGroupIds = await getGroupIdsByUserId({
        userId: params.userId,
    });

    let startDate: Date;
    let endDate: Date;
    if (params.start && params.end) {
        startDate = toDate(params.start, "00", "00", "00");
        endDate = toDate(params.end, "23", "59", "59");

        match.created_time = {
            $gte: startDate,
            $lte: endDate,
        };
    }

    let startDatePrew: Date;
    let endDatePrew: Date;
    if (params.startPrew && params.endPrew) {
        startDatePrew = toDate(params.startPrew, "00", "00", "00");
        endDatePrew = toDate(params.endPrew, "23", "59", "59");

        matchPrew.created_time = {
            $gte: startDatePrew,
            $lte: endDatePrew,
        };
    }

    if (params.userTenant) {
        match.tenant = params.userTenant;
        matchPrew.tenant = params.userTenant;

        const response = await findRoleByIds(
            params.userRoles,
            params.userTenant
        );
        if (response.status === HttpStatus.OK) {
            const roles = response.body;
            if (roles && roles.length > 0) {
                const isView = roles.some(
                    (role) => role.request_permission.view
                );
                const isCustomer = roles.some(
                    (role) =>
                        role.type.includes(RoleType.CUSTOMER) ||
                        (role.type === RoleType.DEFAULT && role.id === "EU")
                );
                const isEmployee = roles.some(
                    (role) =>
                        role.type.includes(RoleType.EMPLOYEE) ||
                        (role.type.includes(RoleType.DEFAULT) &&
                            (role.id === "L1" || role.id === "L2"))
                );
                const isTA = roles.some(
                    (role) =>
                        role.type.includes(RoleType.DEFAULT) && role.id === "TA"
                );
                const isTechnician = roles.some(
                    (role) =>
                        !role.advanced_view_permission.all_ticket &&
                        !role.advanced_view_permission.group_ticket &&
                        role.advanced_view_permission.technician_ticket
                );
                const isGroup = roles.some(
                    (role) =>
                        !role.advanced_view_permission.all_ticket &&
                        role.advanced_view_permission.group_ticket
                );
                const isAll = roles.some(
                    (role) => role.advanced_view_permission.all_ticket
                );
                if (isView) {
                    if (isCustomer && !isEmployee && !isTA) {
                        match = {
                            $or: [
                                {
                                    "creator.id": params.userId,
                                },
                                {
                                    "requester.id": params.userId,
                                },
                            ],
                        };
                        matchPrew = {
                            $or: [
                                {
                                    "creator.id": params.userId,
                                },
                                {
                                    "requester.id": params.userId,
                                },
                            ],
                        };
                    }
                    if (isEmployee && !isTA) {
                        if (isTechnician && !isGroup && !isAll) {
                            match = {
                                ...match,
                                $or: [
                                    {
                                        "technician.id": params.userId,
                                    },
                                ],
                            };
                            matchPrew = {
                                ...matchPrew,
                                $or: [
                                    {
                                        "technician.id": params.userId,
                                    },
                                ],
                            };
                        }
                        if (isGroup && !isAll) {
                            match = {
                                ...match,
                                $or: [
                                    {
                                        "group.id": { $in: getGroupIds },
                                    },
                                ],
                            };
                            matchPrew = {
                                ...matchPrew,
                                $or: [
                                    {
                                        "group.id": { $in: getGroupIds },
                                    },
                                ],
                            };
                        }
                    }
                }
            }
        }
    }

    const group = {
        _id: "$technician.id",
        id: {
            $first: "$technician.id",
        },
        name: {
            $first: "$technician.fullname",
        },
        count: { $sum: 1 },
    };
    pipeline.push(
        { $match: match },
        { $group: group },
        { $project: { _id: 0 } },
        { $sort: { count: -1 } }
    );
    pipelinePrew.push(
        { $match: matchPrew },
        { $group: group },
        { $project: { _id: 0 } },
        { $sort: { count: -1 } }
    );

    const resultNow = (await Ticket.aggregate(pipeline)).filter(
        (item) => item.id !== null // TODO: check remove null
    );
    const resultPrew = (await Ticket.aggregate(pipelinePrew)).filter(
        (item) => item.id !== null // TODO: check remove null
    );

    const result = resultNow.map((item) => {
        const prewItem = resultPrew.find((prewItem) => prewItem.id === item.id);
        if (prewItem && prewItem.count > 0) {
            return {
                ...item,
                scale: Math.abs(
                    ((item.count - prewItem.count) / prewItem.count) * 100
                ).toFixed(1),
                arrow: item.count >= prewItem.count ? "up" : "down",
            };
        } else {
            return {
                ...item,
                scale: null,
                arrow: null,
            };
        }
    });
    return success.ok({
        total: result.length,
        data: result,
    });
}

export async function exportTicketSLA(
    params: {
        userRoles: string[];
        userTenant?: string;
        userId: string;
    } & ExportTicketSLAReqQuery
): Promise<ExcelJs.Workbook> {
    const startDate = toDate(params.start, "00", "00", "00");
    const endDate = toDate(params.end, "23", "59", "59");

    let match: FilterQuery<ITicket> = { tenant: params.userTenant };
    if (params.start && params.end && params.type) {
        const startDate = toDate(params.start, "00", "00", "00");
        const endDate = toDate(params.end, "23", "59", "59");
        const created_time_condition = {
            $and: [
                { created_time: { $gte: startDate } },
                { created_time: { $lte: endDate } },
            ],
        };
        const overdue_time_condition = {
            $and: [
                { overdue_time: { $gte: startDate } },
                { overdue_time: { $lte: endDate } },
            ],
        };
        if (params.type === "created_time") {
            match = { ...match, ...created_time_condition };
        }
        if (params.type === "overdue_time") {
            match = {
                ...match,
                ...overdue_time_condition,
            };
        }
    }

    if (params.userTenant) {
        const [getGroupIds, response] = await Promise.all([
            getGroupIdsByUserId({
                userId: params.userId,
            }),
            findRoleByIds(params.userRoles, params.userTenant),
        ]);
        if (response.status === HttpStatus.OK) {
            const roles = response.body;
            if (roles && roles.length > 0) {
                const isView = roles.some(
                    (role) => role.request_permission.view
                );
                const isCustomer = roles.some(
                    (role) =>
                        role.type.includes(RoleType.CUSTOMER) ||
                        (role.type === RoleType.DEFAULT && role.id === "EU")
                );
                const isEmployee = roles.some(
                    (role) =>
                        role.type.includes(RoleType.EMPLOYEE) ||
                        (role.type.includes(RoleType.DEFAULT) &&
                            (role.id === "L1" || role.id === "L2"))
                );
                const isTA = roles.some(
                    (role) =>
                        role.type.includes(RoleType.DEFAULT) && role.id === "TA"
                );
                const isTechnician = roles.some(
                    (role) =>
                        !role.advanced_view_permission.all_ticket &&
                        !role.advanced_view_permission.group_ticket &&
                        role.advanced_view_permission.technician_ticket
                );
                const isGroup = roles.some(
                    (role) =>
                        !role.advanced_view_permission.all_ticket &&
                        role.advanced_view_permission.group_ticket
                );
                const isAll = roles.some(
                    (role) => role.advanced_view_permission.all_ticket
                );
                if (isView) {
                    if (isCustomer && !isEmployee && !isTA) {
                        match = {
                            ...match,
                            $or: [
                                {
                                    "creator.id": params.userId,
                                },
                                {
                                    "requester.id": params.userId,
                                },
                            ],
                        };
                    }
                    if (isEmployee && !isTA) {
                        if (isTechnician && !isGroup && !isAll) {
                            match = {
                                ...match,
                                $or: [
                                    {
                                        "technician.id": params.userId,
                                    },
                                ],
                            };
                        }
                        if (isGroup && !isAll) {
                            match = {
                                ...match,
                                $or: [
                                    {
                                        "group.id": { $in: getGroupIds },
                                    },
                                ],
                            };
                        }
                    }
                }
            }
        }
    }

    if (typeof params.sla === "boolean") {
        match = match
            ? {
                  ...match,

                  "sla.is_active": {
                      $eq: params.sla,
                  },
              }
            : {
                  "sla.is_active": {
                      $eq: params.sla,
                  },
              };
    }

    if (params.departments && params.departments.length > 0) {
        match = match
            ? {
                  ...match,

                  "requester.department.id": {
                      $in: params.departments,
                  },
              }
            : {
                  "requester.department.id": {
                      $in: params.departments,
                  },
              };
    }
    if (params.requesters && params.requesters.length > 0) {
        match = match
            ? {
                  ...match,

                  "requester.id": {
                      $in: params.requesters,
                  },
              }
            : {
                  "requester.id": {
                      $in: params.requesters,
                  },
              };
    }
    if (params.services && params.services.length > 0) {
        match = match
            ? {
                  ...match,

                  "service.id": {
                      $in: params.services,
                  },
              }
            : {
                  "service.id": {
                      $in: params.services,
                  },
              };
    }
    if (params.types && params.types.length > 0) {
        match = match
            ? {
                  ...match,

                  "type.id": {
                      $in: params.types,
                  },
              }
            : {
                  "type.id": {
                      $in: params.types,
                  },
              };
    }
    if (params.priorities && params.priorities.length > 0) {
        match = match
            ? {
                  ...match,

                  "priority.id": {
                      $in: params.priorities,
                  },
              }
            : {
                  "priority.id": {
                      $in: params.priorities,
                  },
              };
    }
    if (params.groups && params.groups.length > 0) {
        match = match
            ? {
                  ...match,

                  "group.id": {
                      $in: params.groups,
                  },
              }
            : {
                  "group.id": {
                      $in: params.groups,
                  },
              };
    }
    if (params.technicians && params.technicians.length > 0) {
        match = match
            ? {
                  ...match,

                  "technician.id": {
                      $in: params.technicians,
                  },
              }
            : {
                  "technician.id": {
                      $in: params.technicians,
                  },
              };
    }
    if (typeof params.response_assurance === "boolean") {
        match = match
            ? {
                  ...match,

                  "sla.response_assurance.is_overdue": {
                      $eq: params.response_assurance,
                  },
              }
            : {
                  "sla.response_assurance.is_overdue": {
                      $in: params.response_assurance,
                  },
              };
    }
    if (typeof params.resolving_assurance === "boolean") {
        match = match
            ? {
                  ...match,

                  "sla.resolving_assurance.is_overdue": {
                      $eq: params.resolving_assurance,
                  },
              }
            : {
                  "sla.resolving_assurance.is_overdue": {
                      $in: params.resolving_assurance,
                  },
              };
    }

    const tickets = await Ticket.find(match, {
        name: 1,
        number: 1,
        created_time: 1,
        description: 1,
        creator: 1,
        requester: 1,
        status: 1,
        type: 1,
        channel: 1,
        group: 1,
        technician: 1,
        priority: 1,
        service: 1,
        sub_service: 1,
        overdue_time: 1,
        sla: 1,
        closed_time: 1,
    }).lean();

    console.log("🚀 ~ file: get.ticket.ts:1706 ~ params.sla: true", params.sla);
    const workbook = await getTicketWorkbookForSLA({
        ...params,
        sla: params.sla,
        tickets,
        start: startDate,
        end: endDate,
    });
    return workbook;
}

export async function exportTickets(
    params: {
        userRoles: string[];
        userTenant?: string;
        userId: string;
    } & ExportTicketReqQuery
): Promise<ExcelJs.Workbook> {
    const startDate = toDate(params.start, "00", "00", "00");
    const endDate = toDate(params.end, "23", "59", "59");

    let filter: FilterQuery<ITicket> = {};

    if (params.start && params.end && params.type) {
        const created_time_condition = {
            $and: [
                { created_time: { $gte: startDate } },
                { created_time: { $lte: endDate } },
            ],
        };
        const overdue_time_condition = {
            $and: [
                { overdue_time: { $gte: startDate } },
                { overdue_time: { $lte: endDate } },
            ],
        };
        if (params.type === "created_time") {
            filter = filter
                ? { $and: [filter, created_time_condition] }
                : created_time_condition;
        }
        if (params.type === "overdue_time") {
            filter = filter
                ? {
                      $and: [filter, overdue_time_condition],
                  }
                : overdue_time_condition;
        }
    }

    if (params.userTenant) {
        const tenantCondition = {
            tenant: params.userTenant,
        };
        filter = filter
            ? {
                  $and: [filter, tenantCondition],
              }
            : tenantCondition;
    }

    const getGroupIds = await getGroupIdsByUserId({
        userId: params.userId,
    });

    if (params.userTenant) {
        const response = await findRoleByIds(
            params.userRoles,
            params.userTenant
        );
        if (response.status === HttpStatus.OK) {
            const roles = response.body;
            if (roles && roles.length > 0) {
                const isView = roles.some(
                    (role) => role.request_permission.view
                );
                const isCustomer = roles.some(
                    (role) =>
                        role.type.includes(RoleType.CUSTOMER) ||
                        (role.type === RoleType.DEFAULT && role.id === "EU")
                );
                const isEmployee = roles.some(
                    (role) =>
                        role.type.includes(RoleType.EMPLOYEE) ||
                        (role.type.includes(RoleType.DEFAULT) &&
                            (role.id === "L1" || role.id === "L2"))
                );
                const isTA = roles.some(
                    (role) =>
                        role.type.includes(RoleType.DEFAULT) && role.id === "TA"
                );
                const isTechnician = roles.some(
                    (role) =>
                        !role.advanced_view_permission.all_ticket &&
                        !role.advanced_view_permission.group_ticket &&
                        role.advanced_view_permission.technician_ticket
                );
                const isGroup = roles.some(
                    (role) =>
                        !role.advanced_view_permission.all_ticket &&
                        role.advanced_view_permission.group_ticket
                );
                const isAll = roles.some(
                    (role) => role.advanced_view_permission.all_ticket
                );
                if (isView) {
                    if (isCustomer && !isEmployee && !isTA) {
                        filter = {
                            ...filter,
                            $or: [
                                {
                                    "creator.id": params.userId,
                                },
                                {
                                    "requester.id": params.userId,
                                },
                            ],
                        };
                    }
                    if (isEmployee && !isTA) {
                        if (isTechnician && !isGroup && !isAll) {
                            filter = {
                                ...filter,
                                $or: [
                                    {
                                        "technician.id": params.userId,
                                    },
                                ],
                            };
                        }
                        if (isGroup && !isAll) {
                            filter = {
                                ...filter,
                                $or: [
                                    {
                                        "group.id": { $in: getGroupIds },
                                    },
                                ],
                            };
                        }
                    }
                }
            }
        }
    }

    if (params.departments && params.departments.length > 0) {
        filter = filter
            ? {
                  $and: [
                      filter,
                      {
                          "requester.department.id": {
                              $in: params.departments,
                          },
                      },
                  ],
              }
            : {
                  "requester.department.id": {
                      $in: params.departments,
                  },
              };
    }
    if (params.requesters && params.requesters.length > 0) {
        filter = filter
            ? {
                  $and: [
                      filter,

                      {
                          "requester.id": {
                              $in: params.requesters,
                          },
                      },
                  ],
              }
            : {
                  "requester.id": {
                      $in: params.requesters,
                  },
              };
    }
    if (params.services && params.services.length > 0) {
        filter = filter
            ? {
                  $and: [
                      filter,

                      {
                          "service.id": {
                              $in: params.services,
                          },
                      },
                  ],
              }
            : {
                  "service.id": {
                      $in: params.services,
                  },
              };
    }
    if (params.types && params.types.length > 0) {
        filter = filter
            ? {
                  $and: [
                      filter,

                      {
                          "type.id": {
                              $in: params.types,
                          },
                      },
                  ],
              }
            : {
                  "type.id": {
                      $in: params.types,
                  },
              };
    }
    if (params.priorities && params.priorities.length > 0) {
        filter = filter
            ? {
                  $and: [
                      filter,

                      {
                          "priority.id": {
                              $in: params.priorities,
                          },
                      },
                  ],
              }
            : {
                  "priority.id": {
                      $in: params.priorities,
                  },
              };
    }
    if (params.groups && params.groups.length > 0) {
        filter = filter
            ? {
                  $and: [
                      filter,

                      {
                          "group.id": {
                              $in: params.groups,
                          },
                      },
                  ],
              }
            : {
                  "group.id": {
                      $in: params.groups,
                  },
              };
    }
    if (params.technicians && params.technicians.length > 0) {
        filter = filter
            ? {
                  $and: [
                      filter,

                      {
                          "technician.id": {
                              $in: params.technicians,
                          },
                      },
                  ],
              }
            : {
                  "technician.id": {
                      $in: params.technicians,
                  },
              };
    }
    if (params.response_assurance) {
        filter = filter
            ? {
                  $and: [
                      filter,
                      {
                          "sla.response_assurance.is_overdue": {
                              $eq: params.response_assurance,
                          },
                      },
                  ],
              }
            : {
                  "sla.response_assurance.is_overdue": {
                      $in: params.response_assurance,
                  },
              };
    }
    if (params.resolving_assurance) {
        filter = filter
            ? {
                  $and: [
                      filter,
                      {
                          "sla.resolving_assurance.is_overdue": {
                              $eq: params.resolving_assurance,
                          },
                      },
                  ],
              }
            : {
                  "sla.resolving_assurance.is_overdue": {
                      $in: params.resolving_assurance,
                  },
              };
    }

    const tickets = await Ticket.find(filter, {
        number: 1,
        name: 1,
        requester: 1,
        created_time: 1,
        description: 1,
        creator: 1,
        status: 1,
        type: 1,
        channel: 1,
        group: 1,
        technician: 1,
        priority: 1,
        service: 1,
        sub_service: 1,
        overdue_time: 1,
        sla: 1,
        closed_time: 1,
    }).lean();

    const workbook = await getTicketWorkbook({
        ...params,
        tickets,
        start: startDate,
        end: endDate,
    });
    return workbook;
}

export async function exportTicketsSLAPdf(
    params: {
        userRoles: string[];
        userTenant?: string;
        userId: string;
    } & ExportTicketSLAReqQuery
): Promise<Buffer> {
    const startDate = toDate(params.start, "00", "00", "00");
    const endDate = toDate(params.end, "23", "59", "59");

    let match: FilterQuery<ITicket> = { tenant: params.userTenant };
    if (params.start && params.end && params.type) {
        const startDate = toDate(params.start, "00", "00", "00");
        const endDate = toDate(params.end, "23", "59", "59");
        const created_time_condition = {
            $and: [
                { created_time: { $gte: startDate } },
                { created_time: { $lte: endDate } },
            ],
        };
        const overdue_time_condition = {
            $and: [
                { overdue_time: { $gte: startDate } },
                { overdue_time: { $lte: endDate } },
            ],
        };
        if (params.type === "created_time") {
            match = { ...match, ...created_time_condition };
        }
        if (params.type === "overdue_time") {
            match = {
                ...match,
                ...overdue_time_condition,
            };
        }
    }

    if (params.userTenant) {
        const [getGroupIds, response] = await Promise.all([
            getGroupIdsByUserId({
                userId: params.userId,
            }),
            findRoleByIds(params.userRoles, params.userTenant),
        ]);
        if (response.status === HttpStatus.OK) {
            const roles = response.body;
            if (roles && roles.length > 0) {
                const isView = roles.some(
                    (role) => role.request_permission.view
                );
                const isCustomer = roles.some(
                    (role) =>
                        role.type.includes(RoleType.CUSTOMER) ||
                        (role.type === RoleType.DEFAULT && role.id === "EU")
                );
                const isEmployee = roles.some(
                    (role) =>
                        role.type.includes(RoleType.EMPLOYEE) ||
                        (role.type.includes(RoleType.DEFAULT) &&
                            (role.id === "L1" || role.id === "L2"))
                );
                const isTA = roles.some(
                    (role) =>
                        role.type.includes(RoleType.DEFAULT) && role.id === "TA"
                );
                const isTechnician = roles.some(
                    (role) =>
                        !role.advanced_view_permission.all_ticket &&
                        !role.advanced_view_permission.group_ticket &&
                        role.advanced_view_permission.technician_ticket
                );
                const isGroup = roles.some(
                    (role) =>
                        !role.advanced_view_permission.all_ticket &&
                        role.advanced_view_permission.group_ticket
                );
                const isAll = roles.some(
                    (role) => role.advanced_view_permission.all_ticket
                );
                if (isView) {
                    if (isCustomer && !isEmployee && !isTA) {
                        match = {
                            ...match,
                            $or: [
                                {
                                    "creator.id": params.userId,
                                },
                                {
                                    "requester.id": params.userId,
                                },
                            ],
                        };
                    }
                    if (isEmployee && !isTA) {
                        if (isTechnician && !isGroup && !isAll) {
                            match = {
                                ...match,
                                $or: [
                                    {
                                        "technician.id": params.userId,
                                    },
                                ],
                            };
                        }
                        if (isGroup && !isAll) {
                            match = {
                                ...match,
                                $or: [
                                    {
                                        "group.id": { $in: getGroupIds },
                                    },
                                ],
                            };
                        }
                    }
                }
            }
        }
    }

    if (typeof params.sla === "boolean") {
        match = match
            ? {
                  ...match,

                  "sla.is_active": {
                      $eq: params.sla,
                  },
              }
            : {
                  "sla.is_active": {
                      $eq: params.sla,
                  },
              };
    }

    if (params.departments && params.departments.length > 0) {
        match = match
            ? {
                  ...match,

                  "requester.department.id": {
                      $in: params.departments,
                  },
              }
            : {
                  "requester.department.id": {
                      $in: params.departments,
                  },
              };
    }
    if (params.requesters && params.requesters.length > 0) {
        match = match
            ? {
                  ...match,

                  "requester.id": {
                      $in: params.requesters,
                  },
              }
            : {
                  "requester.id": {
                      $in: params.requesters,
                  },
              };
    }
    if (params.services && params.services.length > 0) {
        match = match
            ? {
                  ...match,

                  "service.id": {
                      $in: params.services,
                  },
              }
            : {
                  "service.id": {
                      $in: params.services,
                  },
              };
    }
    if (params.types && params.types.length > 0) {
        match = match
            ? {
                  ...match,

                  "type.id": {
                      $in: params.types,
                  },
              }
            : {
                  "type.id": {
                      $in: params.types,
                  },
              };
    }
    if (params.priorities && params.priorities.length > 0) {
        match = match
            ? {
                  ...match,

                  "priority.id": {
                      $in: params.priorities,
                  },
              }
            : {
                  "priority.id": {
                      $in: params.priorities,
                  },
              };
    }
    if (params.groups && params.groups.length > 0) {
        match = match
            ? {
                  ...match,

                  "group.id": {
                      $in: params.groups,
                  },
              }
            : {
                  "group.id": {
                      $in: params.groups,
                  },
              };
    }
    if (params.technicians && params.technicians.length > 0) {
        match = match
            ? {
                  ...match,

                  "technician.id": {
                      $in: params.technicians,
                  },
              }
            : {
                  "technician.id": {
                      $in: params.technicians,
                  },
              };
    }
    if (typeof params.response_assurance === "boolean") {
        match = match
            ? {
                  ...match,

                  "sla.response_assurance.is_overdue": {
                      $eq: params.response_assurance,
                  },
              }
            : {
                  "sla.response_assurance.is_overdue": {
                      $in: params.response_assurance,
                  },
              };
    }
    if (typeof params.resolving_assurance === "boolean") {
        match = match
            ? {
                  ...match,

                  "sla.resolving_assurance.is_overdue": {
                      $eq: params.resolving_assurance,
                  },
              }
            : {
                  "sla.resolving_assurance.is_overdue": {
                      $in: params.resolving_assurance,
                  },
              };
    }

    const tickets = await Ticket.find(match, {
        name: 1,
        number: 1,
        created_time: 1,
        description: 1,
        creator: 1,
        requester: 1,
        status: 1,
        type: 1,
        channel: 1,
        group: 1,
        technician: 1,
        priority: 1,
        service: 1,
        sub_service: 1,
        overdue_time: 1,
        sla: 1,
        closed_time: 1,
    }).lean();
    console.log("🚀 ~ file: get.ticket.ts:2355 ~ tickets:", tickets.length);
    console.log("🚀 ~ file: get.ticket.ts:2350 ~ params.sla:true", params.sla);
    const pdf = await exportSLAPdf({
        ...params,
        sla: params.sla,
        tickets,
        start: startDate,
        end: endDate,
    });
    return pdf;
}

export async function exportTicketsPdf(
    params: {
        userRoles: string[];
        userTenant?: string;
        userId: string;
    } & ExportTicketSLAReqQuery
): Promise<Buffer> {
    const startDate = toDate(params.start, "00", "00", "00");
    const endDate = toDate(params.end, "23", "59", "59");

    let filter: FilterQuery<ITicket> = {};

    if (params.start && params.end && params.type) {
        const created_time_condition = {
            $and: [
                { created_time: { $gte: startDate } },
                { created_time: { $lte: endDate } },
            ],
        };
        const overdue_time_condition = {
            $and: [
                { overdue_time: { $gte: startDate } },
                { overdue_time: { $lte: endDate } },
            ],
        };
        if (params.type === "created_time") {
            filter = filter
                ? { $and: [filter, created_time_condition] }
                : created_time_condition;
        }
        if (params.type === "overdue_time") {
            filter = filter
                ? {
                      $and: [filter, overdue_time_condition],
                  }
                : overdue_time_condition;
        }
    }

    if (params.userTenant) {
        const tenantCondition = {
            tenant: params.userTenant,
        };
        filter = filter
            ? {
                  $and: [filter, tenantCondition],
              }
            : tenantCondition;
    }

    const getGroupIds = await getGroupIdsByUserId({
        userId: params.userId,
    });

    if (params.userTenant) {
        const response = await findRoleByIds(
            params.userRoles,
            params.userTenant
        );
        if (response.status === HttpStatus.OK) {
            const roles = response.body;
            if (roles && roles.length > 0) {
                const isView = roles.some(
                    (role) => role.request_permission.view
                );
                const isCustomer = roles.some(
                    (role) =>
                        role.type.includes(RoleType.CUSTOMER) ||
                        (role.type === RoleType.DEFAULT && role.id === "EU")
                );
                const isEmployee = roles.some(
                    (role) =>
                        role.type.includes(RoleType.EMPLOYEE) ||
                        (role.type.includes(RoleType.DEFAULT) &&
                            (role.id === "L1" || role.id === "L2"))
                );
                const isTA = roles.some(
                    (role) =>
                        role.type.includes(RoleType.DEFAULT) && role.id === "TA"
                );
                const isTechnician = roles.some(
                    (role) =>
                        !role.advanced_view_permission.all_ticket &&
                        !role.advanced_view_permission.group_ticket &&
                        role.advanced_view_permission.technician_ticket
                );
                const isGroup = roles.some(
                    (role) =>
                        !role.advanced_view_permission.all_ticket &&
                        role.advanced_view_permission.group_ticket
                );
                const isAll = roles.some(
                    (role) => role.advanced_view_permission.all_ticket
                );
                if (isView) {
                    if (isCustomer && !isEmployee && !isTA) {
                        filter = {
                            ...filter,
                            $or: [
                                {
                                    "creator.id": params.userId,
                                },
                                {
                                    "requester.id": params.userId,
                                },
                            ],
                        };
                    }
                    if (isEmployee && !isTA) {
                        if (isTechnician && !isGroup && !isAll) {
                            filter = {
                                ...filter,
                                $or: [
                                    {
                                        "technician.id": params.userId,
                                    },
                                ],
                            };
                        }
                        if (isGroup && !isAll) {
                            filter = {
                                ...filter,
                                $or: [
                                    {
                                        "group.id": { $in: getGroupIds },
                                    },
                                ],
                            };
                        }
                    }
                }
            }
        }
    }
    if (params.departments && params.departments.length > 0) {
        filter = filter
            ? {
                  $and: [
                      filter,
                      {
                          "requester.department.id": {
                              $in: params.departments,
                          },
                      },
                  ],
              }
            : {
                  "requester.department.id": {
                      $in: params.departments,
                  },
              };
    }
    if (params.requesters && params.requesters.length > 0) {
        filter = filter
            ? {
                  $and: [
                      filter,

                      {
                          "requester.id": {
                              $in: params.requesters,
                          },
                      },
                  ],
              }
            : {
                  "requester.id": {
                      $in: params.requesters,
                  },
              };
    }
    if (params.services && params.services.length > 0) {
        filter = filter
            ? {
                  $and: [
                      filter,

                      {
                          "service.id": {
                              $in: params.services,
                          },
                      },
                  ],
              }
            : {
                  "service.id": {
                      $in: params.services,
                  },
              };
    }
    if (params.types && params.types.length > 0) {
        filter = filter
            ? {
                  $and: [
                      filter,

                      {
                          "type.id": {
                              $in: params.types,
                          },
                      },
                  ],
              }
            : {
                  "type.id": {
                      $in: params.types,
                  },
              };
    }
    if (params.priorities && params.priorities.length > 0) {
        filter = filter
            ? {
                  $and: [
                      filter,

                      {
                          "priority.id": {
                              $in: params.priorities,
                          },
                      },
                  ],
              }
            : {
                  "priority.id": {
                      $in: params.priorities,
                  },
              };
    }
    if (params.groups && params.groups.length > 0) {
        filter = filter
            ? {
                  $and: [
                      filter,

                      {
                          "group.id": {
                              $in: params.groups,
                          },
                      },
                  ],
              }
            : {
                  "group.id": {
                      $in: params.groups,
                  },
              };
    }
    if (params.technicians && params.technicians.length > 0) {
        filter = filter
            ? {
                  $and: [
                      filter,

                      {
                          "technician.id": {
                              $in: params.technicians,
                          },
                      },
                  ],
              }
            : {
                  "technician.id": {
                      $in: params.technicians,
                  },
              };
    }
    if (params.response_assurance) {
        filter = filter
            ? {
                  $and: [
                      filter,
                      {
                          "sla.response_assurance.is_overdue": {
                              $eq: params.response_assurance,
                          },
                      },
                  ],
              }
            : {
                  "sla.response_assurance.is_overdue": {
                      $in: params.response_assurance,
                  },
              };
    }
    if (params.resolving_assurance) {
        filter = filter
            ? {
                  $and: [
                      filter,
                      {
                          "sla.resolving_assurance.is_overdue": {
                              $eq: params.resolving_assurance,
                          },
                      },
                  ],
              }
            : {
                  "sla.resolving_assurance.is_overdue": {
                      $in: params.resolving_assurance,
                  },
              };
    }

    const tickets = await Ticket.find(filter, {
        id: 1,
        number: 1,
        name: 1,
        requester: 1,
        created_time: 1,
        creator: 1,
        status: 1,
        type: 1,
        channel: 1,
        group: 1,
        technician: 1,
        priority: 1,
        service: 1,
        sub_service: 1,
        overdue_time: 1,
        sla: 1,
        closed_time: 1,
        _id: 0,
    }).lean();
    console.log("🚀 ~ file: get.ticket.ts:2690 ~ tickets:", tickets.length);

    const pdf = await exportPdf({
        ...params,
        tickets,
        start: startDate,
        end: endDate,
    });
    return pdf;
}

export async function getTicketsJson(params: {
    page: number;
    size: number;
    sort: string;
    start: string;
    end: string;
    type: string;
    userRoles: string[];
    userTenant?: string;
    userId: string;
}): Promise<Result> {
    const startDate = toDate(params.start, "00", "00", "00");
    const endDate = toDate(params.end, "23", "59", "59");
    const getGroupIds = await getGroupIdsByUserId({
        userId: params.userId,
    });

    const pipeline: PipelineStage[] = [];
    const facetData =
        params.size == -1
            ? []
            : [
                  { $skip: params.size * params.page },
                  { $limit: params.size * 1 },
              ];

    const facet = {
        meta: [{ $count: "total" }],
        data: facetData,
    };

    try {
        if (params.sort) {
            let sort: undefined | Record<string, 1 | -1> = undefined;
            sort = parseSort(params.sort);
            sort ? pipeline.push({ $sort: sort }) : null;
        }
    } catch (e) {
        const err = e as unknown as ParseSyntaxError;
        const errorValue = err.message === params.sort;
        throw new HttpError(
            error.invalidData({
                location: "query",
                param: err.type,
                message: err.message,
                value: errorValue,
            })
        );
    }

    let filter = {};
    let role: object[] = [];
    if (params.userRoles.includes("L2")) {
        role = [
            {
                "creator.id": params.userId,
            },
            {
                "requester.id": params.userId,
            },
            {
                $and: [
                    {
                        group: { $exists: true },
                    },
                    {
                        $or: [
                            {
                                "group.id": { $in: getGroupIds },
                            },
                            {
                                "technician.id": params.userId,
                            },
                        ],
                    },
                ],
            },
        ];
    }
    params.type === "created_time"
        ? (filter = {
              $and: [
                  { created_time: { $gte: startDate } },
                  { created_time: { $lte: endDate } },
              ],
          })
        : params.type === "overdue_time"
        ? (filter = {
              $and: [
                  { overdue_time: { $gte: startDate } },
                  { overdue_time: { $lte: endDate } },
              ],
          })
        : null;

    let match = {};
    if (params.userTenant) {
        match = {
            $and: [...role, filter, { tenant: params.userTenant }],
        };
    }

    pipeline.push({ $match: match });
    try {
        if (params.sort) {
            let sort: undefined | Record<string, 1 | -1> = undefined;
            sort = parseSort(params.sort);
            sort ? pipeline.push({ $sort: sort }) : null;
        }
    } catch (e) {
        const err = e as unknown as ParseSyntaxError;
        const errorValue = err.message === params.sort;
        throw new HttpError(
            error.invalidData({
                location: "query",
                param: err.type,
                message: err.message,
                value: errorValue,
            })
        );
    }
    pipeline.push(
        {
            $project: {
                number: 1,
                name: 1,
                requester: 1,
                created_time: 1,
                type: 1,
                channel: 1,
                status: "$status.name",
                priority: "$priority.name",
                service: "$service.name",
                group: "$group",
                technician: 1,
                sub_service: 1,
                overdue_time: 1,
                resolved_time: 1,
                closed_time: 1,
                _id: 0,
            },
        },
        { $facet: facet }
    );
    const tickets = await Ticket.aggregate(pipeline)
        .collation({ locale: "vi" })
        .then((res) => res[0])
        .then((res) => {
            const total = !(res.meta.length > 0) ? 0 : res.meta[0].total;
            let totalPage = Math.ceil(total / params.size);
            totalPage = totalPage > 0 ? totalPage : 1;
            return {
                page: Number(params.page),
                total: total,
                total_page: totalPage,
                data: res.data,
            };
        });

    return success.ok(tickets);
}

export async function getRequester(params: {
    tenant: string;
    query?: string;
    size?: number;
}): Promise<Result> {
    // TODO FIX function findUser
    const [response] = await Promise.all([
        findUser(params.tenant, params.size, params.query, true),
    ]);
    if (response.body) {
        return success.ok(response.body);
    } else {
        // ignore errors
        return success.ok([]);
    }
}

export async function getStatusTicketById(id: string): Promise<string> {
    const ticket = await Ticket.findOne({ id: id }, { status: 1 });

    if (!ticket) {
        throw new HttpError({
            status: HttpStatus.BAD_REQUEST,
            code: "INVALID_DATA",
            description: {
                en: "Ticket not found",
                vi: `Không tìm thấy Ticket id: ${id}`,
            },
            errors: [
                {
                    param: "id",
                    location: "body",
                    value: id,
                },
            ],
        });
    }
    if (!ticket.status) {
        throw new Error("Status of ticket is null or undefined");
    }
    return ticket.status.id;
}

export async function findTicketNotConnect(params: {
    query?: string;
    sort?: string;
    size: number;
    page: number;
    ticketId?: string;
    ticketTenant?: string;
    userRoles: string[];
    userTenant?: string;
    userId: string;
    type: string;
}): Promise<Result> {
    const pipeline: PipelineStage[] = [];
    let match: undefined | FilterQuery<ITicket> = undefined;
    let user_filter: undefined | FilterQuery<ITicket> = undefined;
    let sort: undefined | Record<string, 1 | -1> = undefined;
    try {
        user_filter = params.query ? parseQuery(params.query) : undefined;
        sort = params.sort
            ? parseSort(params.sort)
            : parseSort("created_time=-1");
    } catch (e) {
        const err = e as unknown as ParseSyntaxError;
        const errorValue =
            err.message === params.sort ? params.sort : params.query;
        throw new HttpError(
            error.invalidData({
                location: "query",
                param: err.type,
                message: err.message,
                value: errorValue,
            })
        );
    }

    const getGroupIds = await getGroupIdsByUserId({
        userId: params.userId,
    });

    if (params.userTenant) {
        const response = await findRoleByIds(
            params.userRoles,
            params.userTenant
        );
        if (response.status === HttpStatus.OK) {
            const roles = response.body;
            if (roles && roles.length > 0) {
                const isView = roles.some(
                    (role) => role.request_permission.view
                );
                const isCustomer = roles.some(
                    (role) =>
                        role.type.includes(RoleType.CUSTOMER) ||
                        (role.type === RoleType.DEFAULT && role.id === "EU")
                );
                const isEmployee = roles.some(
                    (role) =>
                        role.type.includes(RoleType.EMPLOYEE) ||
                        (role.type.includes(RoleType.DEFAULT) &&
                            (role.id === "L1" || role.id === "L2"))
                );
                const isTA = roles.some(
                    (role) =>
                        role.type.includes(RoleType.DEFAULT) && role.id === "TA"
                );
                const isTechnician = roles.some(
                    (role) =>
                        !role.advanced_view_permission.all_ticket &&
                        !role.advanced_view_permission.group_ticket &&
                        role.advanced_view_permission.technician_ticket
                );
                const isGroup = roles.some(
                    (role) =>
                        !role.advanced_view_permission.all_ticket &&
                        role.advanced_view_permission.group_ticket
                );
                const isAll = roles.some(
                    (role) => role.advanced_view_permission.all_ticket
                );
                if (isCustomer) {
                    const error: ResultError = {
                        status: HttpStatus.METHOD_NOT_ALLOWED,
                        errors: [
                            {
                                message:
                                    "You do not have permission to create or add ticket links",
                            },
                        ],
                    };
                    throw new HttpError(error);
                }
                if (isView) {
                    if (isCustomer && !isEmployee && !isTA) {
                        match = {
                            $or: [
                                {
                                    "creator.id": params.userId,
                                },
                                {
                                    "requester.id": params.userId,
                                },
                            ],
                        };
                    }
                    if (isEmployee && !isTA) {
                        if (isTechnician && !isGroup && !isAll) {
                            match = {
                                ...match,
                                $or: [
                                    {
                                        "technician.id": params.userId,
                                    },
                                ],
                            };
                        }
                        if (isGroup && !isAll) {
                            match = {
                                ...match,
                                $or: [
                                    {
                                        "group.id": { $in: getGroupIds },
                                    },
                                ],
                            };
                        }
                    }
                }
            }
        }
    }

    // if (params.userTenant) {
    //     const tenantCondition = {
    //         tenant: params.userTenant,
    //     };
    //     match = match
    //         ? {
    //               $and: [match, tenantCondition],
    //           }
    //         : tenantCondition;
    // }
    if (params.type === "request") {
        const check_tenant = await Ticket.findOne(
            {
                id: params.ticketId,
            },
            { tenant: 1 }
        );

        if (!check_tenant) {
            throw new HttpError(
                error.notFound({
                    message: `Ticket request (${params.ticketId} dosen't exist)`,
                })
            );
        }

        match = {
            $and: [
                { tenant: check_tenant.tenant, ...match, ...user_filter },
                {
                    "connect.requests": {
                        // $elemMatch: {
                        $nin: [params.ticketId],
                        // },
                    },
                },
                {
                    id: {
                        $ne: params.ticketId,
                    },
                },
            ],
        };
    } else if (params.type === "incident") {
        match = {
            $and: [
                { tenant: params.ticketTenant, ...match, ...user_filter },
                {
                    $or: [
                        { "connect.requests": { $exists: false } },
                        {
                            "connect.requests": {
                                // $elemMatch: {
                                $nin: [params.ticketId],
                                // },
                            },
                        },
                    ],
                },
            ],
        };
    } else {
        throw new HttpError(
            error.invalidData({
                location: "query params",
                param: "type",
                message: "type must be one of the values [request,incident]",
            })
        );
    }

    match ? pipeline.push({ $match: match }) : null;
    const project: ProjectionFields<ITicket> = {
        _id: 0,
        id: 1,
        name: 1,
        number: 1,
        tenant: 1,
        type: "$type.name",
        department: "$requester.department.name",
        status: "$status.name",
        priority: "$priority.name",
        service: "$service.name",
        group: "$group.name",
        created_time: 1,
        overdue_time: 1,
        requester: "$requester.fullname",
        technician: "$technician.fullname",
        connect: 1,
    };
    const facet = {
        meta: [{ $count: "total" }],
        data: [
            { $skip: params.size * params.page },
            { $limit: params.size * 1 },
        ],
    };

    pipeline.push(
        { $project: project },
        { $match: user_filter ?? {} },
        { $sort: { ...sort } },
        { $facet: facet }
    );
    const result = await Ticket.aggregate(pipeline)
        .collation({ locale: "vi", numericOrdering: true })
        .allowDiskUse(true)
        .then((res) => res[0])
        .then((res) => {
            const total = !(res.meta.length > 0) ? 0 : res.meta[0].total;
            return {
                page: Number(params.page),
                total: total,
                total_page: Math.ceil(total / params.size),
                data: res.data,
            };
        });
    return success.ok(result);
}

export async function findTicketNotConnectIncident(params: {
    query?: string;
    sort?: string;
    size: number;
    page: number;
    ticketId: string;
    userRoles: string[];
    userTenant?: string;
    userId: string;
    type: string;
}): Promise<Result> {
    const ticket_tenant = await Ticket.findOne(
        { id: params.ticketId },
        { tenant: 1 }
    );
    if (!ticket_tenant) {
        throw new HttpError(
            error.notFound({
                message: `Ticket request (${params.ticketId} dosen't exist)`,
            })
        );
    }
    const result = await getTicketNotConnectIncident({
        ...params,
        ticketTenant: ticket_tenant.tenant,
    });
    return success.ok(result.data);
}
