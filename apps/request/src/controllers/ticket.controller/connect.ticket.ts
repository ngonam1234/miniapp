import { error, HttpError, HttpStatus, Result, ResultError, ResultSuccess, success } from "app";
import { FilterQuery, PipelineStage, ProjectionFields } from "mongoose";
import { parseSort, ParseSyntaxError } from "mquery";
import { ETicketAction, ITicket } from "../../interfaces/models";
import { RoleType } from "../../interfaces/response";
import { ConnectResBody } from "../../interfaces/response/connect.body";
import { Ticket } from "../../models";
import {
    buildConnectIncident,
    deleteConnectsRequest,
    findRoleByIds,
    getConnectsRequest,
    getUserById,
    updateConnectRequest,
} from "../../service";

export async function buildConnectTicket(params: {
    type: string;
    requests: string[];
    incidents: string[];
    userId: string;
}): Promise<Result> {
    const creator = await getUserById(params.userId);

    const requests = params.requests.map((id) => {
        return Ticket.findOne({ id: id });
    });

    const ticketRequests = await Promise.all(requests);

    const updateConnects = ticketRequests.map((t) => {
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
            if (!connectRequests.includes(i) && i !== t.id) {
                connectRequests.push(i);
            }
        });

        params.incidents.forEach((i) => {
            if (!connectIncidents.includes(i)) {
                connectIncidents.push(i);
            }
        });

        return Ticket.findOneAndUpdate(
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
    });

    const tickets = await Promise.all(updateConnects);

    let incidentCreated = 0;
    if (params.type === "ex") {
        const connectIncident = await buildConnectIncident({
            requests: params.requests,
            incidents: params.incidents,
            userId: params.userId,
        });
        if (connectIncident) {
            incidentCreated = connectIncident.data;
        }
    }
    const result: ConnectResBody = {
        number: tickets.length + incidentCreated,
        message: `successfully created links for ${
            tickets.length + incidentCreated
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

    const request = await Ticket.findOneAndUpdate(
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

    if (!request) {
        const err = error.invalidData({
            location: "params",
            value: params.id,
            message: `ticket ${params.id} do not exists`,
        });
        throw new HttpError(err);
    }

    const requests = await Ticket.updateMany(
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

            $push: {
                activities: {
                    action: ETicketAction.UPDATE,
                    actor: creator.body,
                    time: new Date(),
                },
            },
        }
    );

    const incidentDelete = await deleteConnectsRequest({ id: params.id });
    const result: ConnectResBody = {
        number: requests.modifiedCount + incidentDelete.data,
        message: `successfully delete links for ${
            requests.modifiedCount + incidentDelete.data
        } tickets`,
    };
    return success.ok(result);
}

export async function deleteConnectsIncident(params: {
    id: string;
}): Promise<Result> {
    const request = await Ticket.updateMany(
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
        }
    );
    return success.ok(request);
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
        created_time: 1,
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
        $in: [...(result.connect?.requests ?? [])],
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
    const connectIncidents = await getConnectsRequest({
        ids: result.connect?.incidents ?? [],
        size: params.size,
        page: params.page,
        sort: params.sort,
        query: params.query,
    });

    if (params.type === "request") {
        return success.ok(connects);
    } else if (params.type === "incident") {
        return success.ok(connectIncidents.data);
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
export async function getConnectsIncident(params: {
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

export async function updateConnectIncident(params: {
    ticketId: string;
    tenantTicket: string;
    requests: string[];
    userId: string;
}): Promise<ResultSuccess> {
    const creator = await getUserById(params.userId);

    const check_tenant = await Ticket.find({
        id: { $in: params.requests },
        tenant: params.tenantTicket,
    }).count();

    if (check_tenant !== params.requests.length) {
        throw new HttpError(
            error.invalidData({
                message: `There exists a ticket that is not in the same tenant as ticket (id: ${params.ticketId})`,
            })
        );
    }

    const temp = await Ticket.updateMany(
        {
            id: {
                $in: [...params.requests],
            },
            tenant: params.tenantTicket,
            "connect.incidents": {
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

                "connect.incidents": params.ticketId,
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
        id: { $in: params.requests },
        tenant: check_ticket.tenant,
    }).count();

    if (check_tenant !== params.requests.length) {
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

    const [incidentUpdate, ticket, temp] = await Promise.all([
        updateConnectRequest({
            ticketId: params.ticketId,
            tenantTicket: check_ticket.tenant,
            incidents: params.incidents,
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
            { id: [...connectRequests] },
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
        ),
    ]);
    if (!ticket && !temp && !incidentUpdate) {
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
