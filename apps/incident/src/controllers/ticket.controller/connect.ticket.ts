import { error, HttpError, HttpStatus, Result, ResultError, ResultSuccess, success } from "app";
import { FilterQuery, PipelineStage, ProjectionFields } from "mongoose";
import { parseSort, ParseSyntaxError } from "mquery";
import { ETicketAction, ITicket } from "../../interfaces/models";
import { RoleType } from "../../interfaces/response";
import { ConnectResBody } from "../../interfaces/response/connect.body";
import { Ticket } from "../../models";
import {
    buildConnectRequest,
    deleteConnectsIncident,
    findRoleByIds,
    getConnectsIncident,
    getUserById,
    updateConnectIncident
} from "../../service";

export async function buildConnectTicket(params: {
    type: string;
    requests: string[];
    incidents: string[];
    userId: string;
}): Promise<Result> {
    const creator = await getUserById(params.userId);

    const incidents = params.incidents.map((id) => {
        return Ticket.findOne({ id: id });
    });

    const ticketIncidentss = await Promise.all(incidents);

    const updateConnects = ticketIncidentss.map((t) => {
        let connectRequests: string[] = [];
        let connectIncidents: string[] = [];

        if (!t) {
            throw new HttpError(
                error.notFound({
                    message: `There is a ticket that does not exist`,
                })
            );
        }

        t.connect?.requests ? (connectRequests = t.connect.requests) : "";
        t.connect?.incidents ? (connectIncidents = t.connect.incidents) : "";

        params.requests.forEach((i) => {
            if (!connectRequests.includes(i)) {
                connectRequests.push(i);
            }
        });

        params.incidents.forEach((i) => {
            if (!connectIncidents.includes(i) && i !== t.id) {
                connectIncidents.push(i);
            }
        });

        const ticket = Ticket.findOneAndUpdate(
            { id: t.id },
            {
                $set: {
                    connect: {
                        requests: connectRequests,

                        incidents: connectIncidents,
                    },
                },
                $push: {
                    activities: {
                        action: ETicketAction.UPDATE,
                        actor: creator.body,
                        time: new Date(),
                    },
                },
            },
            { new: true }
        );
        return ticket;
    });

    const tickets = await Promise.all(updateConnects);
    let requestCreated = 0;
    if (params.type === "ex") {
        const connectRequset = await buildConnectRequest({
            requests: params.requests,
            incidents: params.incidents,
            userId: params.userId,
        });
        if (connectRequset) {
            requestCreated = connectRequset.data;
        }
    }

    const result: ConnectResBody = {
        number: tickets.length + requestCreated,
        message: `successfully created links for ${
            tickets.length + requestCreated
        } tickets`,
    };
    return success.ok(result);
}

export async function deleteConnect(params: {
    id: string;
    requests: string[];
    incidents: string[];
    userId: string;
    userTenant?: string;
    userRoles: string[];
}): Promise<Result> {
    const creator = await getUserById(params.userId);

    if (params.userTenant) {
        const response = await findRoleByIds(
            params.userRoles,
            params.userTenant
        );
        if (response.status === HttpStatus.OK) {
            const roles = response.body;
            if (roles && roles.length > 0) {
                const isCustomer = roles.some(
                    (role) =>
                        role.type.includes(RoleType.CUSTOMER) ||
                        (role.type === RoleType.DEFAULT && role.id === "EU")
                );
                if (isCustomer) {
                    const error: ResultError = {
                        status: HttpStatus.METHOD_NOT_ALLOWED,
                        errors: [
                            {
                                message:
                                    "You do not have permission to delete ticket links",
                            },
                        ],
                    };
                    throw new HttpError(error);
                }
            }
        }
    }

    const incident = await Ticket.findOneAndUpdate(
        { id: params.id },
        {
            $pull: {
                "connect.requests": {
                    $in: [...params.requests],
                },
                "connect.incidents": {
                    $in: [...params.incidents],
                },
            },
            $push: {
                activities: {
                    action: ETicketAction.UPDATE,
                    actor: creator.body,
                    time: new Date(),
                },
            },
        },
        { new: false }
    );

    if (!incident) {
        const err = error.invalidData({
            location: "params",
            value: params.id,
            message: `ticket ${params.id} do not exists`,
        });
        throw new HttpError(err);
    }

    const incidents = await Ticket.updateMany(
        {
            "connect.incidents": {
                $elemMatch: {
                    $in: [params.id],
                },
            },
        },
        {
            $pull: {
                "connect.incidents": `${params.id}`,
            },
            $push: {
                activities: {
                    action: ETicketAction.UPDATE,
                    actor: creator.body,
                    time: new Date(),
                },
            },
        }
    );

    const requestDelete = await deleteConnectsIncident({ id: params.id });
    const result: ConnectResBody = {
        number: incidents.modifiedCount + requestDelete.data,
        message: `successfully delete links for ${
            incidents.modifiedCount + requestDelete.data
        } tickets`,
    };
    return success.ok(result);
}

export async function deleteConnectsRequest(params: {
    id: string;
}): Promise<Result> {
    const request = await Ticket.updateMany(
        {
            "connect.requests": {
                $elemMatch: {
                    $in: [params.id],
                },
            },
        },
        {
            $pull: {
                "connect.requests": `${params.id}`,
            },
        }
    );
    return success.ok({ number: request.modifiedCount });
}

export async function getConnectsRequest(params: {
    ids: string[];
    query?: string;
    sort?: string;
    size: number;
    page: number;
}): Promise<ResultSuccess> {
    let sort: Record<string, 1 | -1> = { created_time: -1 };

    try {
        params.sort && (sort = parseSort(params.sort));
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

    const result = await Ticket.aggregate([
        {
            $match: {
                id: {
                    $in: [...params.ids],
                },
            },
        },
        {
            $project: {
                _id: 0,
                id: 1,
                name: 1,
                number: 1,
                status: "$status.name",
                priority: "$priority.name",
                technician: "$technician.fullname",
                group: "$group.name",
                resolution: "$resolution.cause.content",
            },
        },
        { $sort: sort },
        {
            $facet: {
                meta: [{ $count: "total" }],
                data: [
                    { $skip: params.size * params.page },
                    { $limit: params.size * 1 },
                ],
            },
        },
    ])
        .collation({ locale: "vi", numericOrdering: true })
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
export async function getConnectById(params: {
    id: string;
    query?: string;
    sort?: string;
    size: number;
    page: number;
    type: string;
}): Promise<ResultSuccess> {
    const pipeline: PipelineStage[] = [];
    const match: undefined | FilterQuery<ITicket> = {};
    let sort: Record<string, 1 | -1> = { created_time: -1 };
    const facet = {
        meta: [{ $count: "total" }],
        data: [
            { $skip: params.size * params.page },
            { $limit: params.size * 1 },
        ],
    };

    try {
        params.sort && (sort = parseSort(params.sort));
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
    const project: ProjectionFields<ITicket> = {
        _id: 0,
        id: 1,
        name: 1,
        number: 1,
        status: "$status.name",
        priority: "$priority.name",
        technician: "$technician.fullname",
        group: "$group.name",
        resolution: "$resolution.cause.content",
    };

    const result = await Ticket.findOne(
        { id: params.id },
        { connect: 1, _id: 0 }
    );

    if (!result) {
        const err = error.invalidData({
            location: "params",
            value: params.id,
            message: `ticket ${params.id} do not exists`,
        });
        throw new HttpError(err);
    }
    match["id"] = {
        $in: [params.id, ...(result.connect?.incidents ?? [])],
    };

    match ? pipeline.push({ $match: match }) : null;
    pipeline.push(
        {
            $project: project,
        },
        { $sort: sort },
        { $facet: facet }
    );

    const connects = await Ticket.aggregate(pipeline)
        .collation({ locale: "vi", numericOrdering: true })
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
    const connectRequests = await getConnectsIncident({
        ids: result.connect?.requests ?? [],
        size: params.size,
        page: params.page,
        sort: params.sort,
        query: params.query,
    });

    if (params.type === "incident") {
        return success.ok(connects);
    } else if (params.type === "request") {
        return success.ok(connectRequests.data);
    } else {
        throw new HttpError(
            error.invalidData({
                location: "query",
                message: "type must request or incident",
                value: params.type,
            })
        );
    }
}

export async function updateConnectRequest(params: {
    ticketId: string;
    tenantTicket: string;
    incidents: string[];
    userId: string;
}): Promise<ResultSuccess> {
    const creator = await getUserById(params.userId);

    const check_tenant = await Ticket.find({
        id: { $in: params.incidents },
        tenant: params.tenantTicket,
    }).count();

    if (check_tenant !== params.incidents.length) {
        throw new HttpError(
            error.invalidData({
                message: `There exists a ticket that is not in the same tenant as ticket (id: ${params.ticketId})`,
            })
        );
    }

    const temp = await Ticket.updateMany(
        {
            id: {
                $in: [...params.incidents],
            },
            tenant: params.tenantTicket,
            "connect.requests": {
                $nin: [params.ticketId],
            },
        },
        {
            $push: {
                activities: {
                    action: ETicketAction.UPDATE,
                    actor: creator.body,
                    time: new Date(),
                },

                "connect.requests": params.ticketId,
            },
        },
        { new: true }
    );

    return success.ok(temp);
}

export async function updateConnectTicketsById(params: {
    ticketId: string;
    requests: string[];
    incidents: string[];
    userId: string;
    userTenant?: string;
    userRoles: string[];
}): Promise<ResultSuccess> {
    const creator = await getUserById(params.userId);

    if (params.userTenant) {
        const response = await findRoleByIds(
            params.userRoles,
            params.userTenant
        );
        if (response.status === HttpStatus.OK) {
            const roles = response.body;
            if (roles && roles.length > 0) {
                const isCustomer = roles.some(
                    (role) =>
                        role.type.includes(RoleType.CUSTOMER) ||
                        (role.type === RoleType.DEFAULT && role.id === "EU")
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
            }
        }
    }

    const check_ticket = await Ticket.findOne(
        { id: params.ticketId },
        { connect: 1, tenant: 1 }
    );

    if (!check_ticket) {
        throw new HttpError(
            error.notFound({
                message: `Ticket incident (${params.ticketId} dosen't exist)`,
            })
        );
    }

    const check_tenant = await Ticket.find({
        id: { $in: params.incidents },
        tenant: check_ticket.tenant,
    }).count();

    if (check_tenant !== params.incidents.length) {
        throw new HttpError(
            error.invalidData({
                message: `There exists a ticket that is not in the same tenant as ticket (id: ${params.ticketId})`,
            })
        );
    }

    if (!check_ticket?.connect) {
        check_ticket.connect = {
            requests: [],
            incidents: [],
        };
        await check_ticket.save();
    }

    const connectRequests: string[] = [];
    const connectIncidents: string[] = [];

    params.requests.forEach((i) => {
        if (
            !connectRequests.includes(i) &&
            !check_ticket.connect?.requests.includes(i)
        ) {
            connectRequests.push(i);
        }
    });

    params.incidents.forEach((i) => {
        if (
            !connectIncidents.includes(i) &&
            !check_ticket.connect?.incidents.includes(i)
        ) {
            connectIncidents.push(i);
        }
    });

    const [requestUpdate, ticket, temp] = await Promise.all([
        updateConnectIncident({
            ticketId: params.ticketId,
            tenantTicket: check_ticket.tenant,
            requests: params.requests,
            userId: params.userId,
        }),
        Ticket.findOneAndUpdate(
            { id: params.ticketId },
            {
                $push: {
                    activities: {
                        action: ETicketAction.UPDATE,
                        actor: creator.body,
                        time: new Date(),
                    },

                    "connect.requests": {
                        $each: [...connectRequests],
                    },
                    "connect.incidents": {
                        $each: [...connectIncidents],
                    },
                },
            }
        ),
        Ticket.updateMany(
            { id: { $in: [...connectIncidents] } },
            {
                $push: {
                    activities: {
                        action: ETicketAction.UPDATE,
                        actor: creator.body,
                        time: new Date(),
                    },

                    "connect.incidents": params.ticketId,
                },
            },
            { new: true }
        ),
    ]);
    if (!ticket && !temp && !requestUpdate) {
        throw new HttpError(
            error.notFound({
                message: `update ticket error`,
            })
        );
    }
    return success.ok({
        message: `update ticket ok`,
    });
}
