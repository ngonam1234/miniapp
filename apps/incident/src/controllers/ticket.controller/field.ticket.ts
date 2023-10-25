import {
    error,
    HttpError,
    HttpStatus,
    Result,
    ResultError,
    success,
} from "app";
import { FilterQuery } from "mongoose";
import {
    IDefaultField,
    IPeople,
    ITicket,
    IWorkflowDetail,
} from "../../interfaces/models";
import { document, Ticket } from "../../models";
import {
    getPossibleCategories,
    getPossibleChannels,
    getPossibleGroups,
    getPossibleImpacts,
    getPossiblePriorities,
    getPossibleServices,
    getPossibleStatus,
    getPossibleSubCategories,
    getPossibleSubServices,
    getPossibleTechnicians,
    getPossibleTypes,
    getPossibleUrgencies,
} from "../common.controller";
import { getPriorityByImpactAndUrgency } from "../priority-matrix.controller";
import logger from "logger";

export async function getTicketStatus(params: {
    ticketId: string;
    userId: string;
    tenant: string;
}): Promise<Result> {
    const ticket = await checkTicket(params);
    const result = await getPossibleStatus(ticket.workflow, ticket.status?.id);
    return success.ok(result);
}

export async function getTicketTypes(params: {
    ticketId: string;
    userId: string;
    tenant: string;
}): Promise<Result> {
    const tenant = params.tenant;
    const [result] = await Promise.all([
        getPossibleTypes(tenant),
        checkTicket(params),
    ]);
    return success.ok(result);
}

export async function getTicketChannels(params: {
    ticketId: string;
    userId: string;
    tenant: string;
}): Promise<Result> {
    const tenant = params.tenant;
    const [result] = await Promise.all([
        getPossibleChannels(tenant),
        checkTicket(params),
    ]);
    return success.ok(result);
}

export async function getTicketPriorities(params: {
    ticketId: string;
    impact: string;
    urgency: string;
    userId: string;
    tenant: string;
}): Promise<Result> {
    const tenant = params.tenant;
    const [result] = await Promise.all([
        getPriorityByImpactAndUrgency({ impact: params.impact, urgency: params.urgency, tenant }),
        checkTicket(params),
    ]);
    return success.ok(result);
}

export async function getTicketUrgencies(params: {
    ticketId: string;
    userId: string;
    tenant: string;
}): Promise<Result> {
    const tenant = params.tenant;
    const [result] = await Promise.all([
        getPossibleUrgencies(tenant),
        checkTicket(params),
    ]);
    return success.ok(result);
}

export async function getTicketImpacts(params: {
    ticketId: string;
    userId: string;
    tenant: string;
}): Promise<Result> {
    const tenant = params.tenant;
    const [result] = await Promise.all([
        getPossibleImpacts(tenant),
        checkTicket(params),
    ]);
    return success.ok(result);
}

export async function getTicketServices(params: {
    ticketId: string;
    userId: string;
    tenant: string;
}): Promise<Result> {
    const tenant = params.tenant;
    const [result] = await Promise.all([
        getPossibleServices(tenant),
        checkTicket(params),
    ]);
    return success.ok(result);
}

export async function getTicketCategories(params: {
    ticketId: string;
    serviceId: string;
    userId: string;
    tenant: string;
}): Promise<Result> {
    const { serviceId, tenant } = params;
    try {
        const [result] = await Promise.all([
            getPossibleCategories(serviceId, tenant),
            checkTicket(params),
        ]);
        return success.ok(result);
    } catch (err) {
        if (err instanceof HttpError) {
            if (err.error.status === HttpStatus.NOT_FOUND) {
                return success.ok([]);
            }
        }
        throw err;
    }
}

export async function getTicketSubCategories(params: {
    ticketId: string;
    categoryId: string;
    userId: string;
    tenant: string;
}): Promise<Result> {
    try {
        const { categoryId, tenant } = params;
        const [result] = await Promise.all([
            getPossibleSubCategories(categoryId, tenant),
            checkTicket(params),
        ]);
        return success.ok(result);
    } catch (err) {
        if (err instanceof HttpError) {
            if (err.error.status === HttpStatus.NOT_FOUND) {
                return success.ok([]);
            }
        }
        throw err;
    }
}

export async function getTicketSubService(params: {
    ticketId: string;
    serviceId: string;
    userId: string;
    tenant: string;
}): Promise<Result> {
    try {
        const { tenant, serviceId } = params;
        const [result] = await Promise.all([
            getPossibleSubServices(serviceId, tenant),
            checkTicket(params),
        ]);
        return success.ok(result);
    } catch (err) {
        if (err instanceof HttpError) {
            if (err.error.status === HttpStatus.NOT_FOUND) {
                return success.ok([]);
            }
        }
        throw err;
    }
}

export async function getTicketGroups(params: {
    ticketId: string;
    userId: string;
    tenant: string;
}): Promise<Result> {
    const tenant = params.tenant;
    const [result] = await Promise.all([
        getPossibleGroups(tenant),
        checkTicket(params),
    ]);
    return success.ok(result);
}

export async function getTicketTechnicians(params: {
    ticketId: string;
    tenant: string;
    userId: string;
    groupId: string;
}): Promise<Result> {
    try {
        const { groupId, tenant } = params;
        const [techs] = await Promise.all([
            getPossibleTechnicians(groupId, tenant),
            checkTicket(params),
        ]);
        const result = techs
            .filter(({ is_active }) => is_active)
            .map(({ id, fullname, email }) => ({
                id: id,
                name: `${fullname} (${email})`,
            }));
        return success.ok(result);
    } catch (err) {
        if (err instanceof HttpError) {
            if (err.error.status === HttpStatus.NOT_FOUND) {
                return success.ok([]);
            }
        }
        throw err;
    }
}

export async function getPossibleFieldData(
    ticket: document<ITicket>,
    fields: { [key: string]: string }
): Promise<
    {
        field: string;
        data: (IDefaultField | IPeople)[];
    }[]
> {
    const workflow: IWorkflowDetail = ticket.workflow;
    const tenant: string = ticket.tenant;
    const requiredFieldError = (
        fieldName: string,
        require: string
    ): ResultError => {
        return error.invalidData({
            location: "body",
            param: `fields.${fieldName}`,
            message: `field ${fieldName} required field ${require}`,
        });
    };
    const invalidValueError = (
        fieldName: string,
        fieldValue: string
    ): ResultError => {
        return error.invalidData({
            location: "body",
            param: `fields.${fieldName}`,
            value: fieldValue,
            message: `the field ${fieldName} does not valid`,
        });
    };
    const result: Promise<{
        field: string;
        data: (IDefaultField | IPeople)[];
    }>[] = [];
    const fieldNames = Object.keys(fields);
    for (let i = 0; i < fieldNames.length; i++) {
        let listData: Promise<(IDefaultField | IPeople)[]> | undefined =
            undefined;
        if (!fields[fieldNames[i]]) continue;
        switch (fieldNames[i]) {
            case "status": {
                const currentStatus = ticket.status?.id;
                listData = getPossibleStatus(workflow, currentStatus);
                break;
            }
            case "type": {
                listData = getPossibleTypes(tenant);
                break;
            }
            case "channel": {
                listData = getPossibleChannels(tenant);
                break;
            }
            case "urgency": {
                listData = getPossibleUrgencies(tenant);
                break;
            }
            case "impact": {
                listData = getPossibleImpacts(tenant);
                break;
            }
            case "priority": {
                listData = getPriorityByImpactAndUrgency({
                    impact: fields.impact,
                    urgency: fields.urgency,
                    tenant
                });
                break;
            }
            case "group": {
                listData = getPossibleGroups(tenant);
                break;
            }
            case "service": {
                listData = getPossibleServices(tenant);
                break;
            }
            case "category": {
                const serviceId = fields["service"];
                if (serviceId) {
                    listData = getPossibleCategories(serviceId, tenant).catch(
                        () => {
                            throw invalidValueError("service", serviceId);
                        }
                    );
                } else {
                    const err = requiredFieldError(fieldNames[i], "service");
                    throw new HttpError(err);
                }
                break;
            }
            case "sub_service": {
                const serviceId = fields["service"];
                if (serviceId) {
                    listData = getPossibleSubServices(serviceId, tenant).catch(
                        () => {
                            throw invalidValueError("service", serviceId);
                        }
                    );
                } else {
                    const err = requiredFieldError(fieldNames[i], "service");
                    throw new HttpError(err);
                }
                break;
            }
            case "sub_category": {
                const categoryId = fields["category"];
                if (categoryId) {
                    listData = getPossibleSubCategories(
                        categoryId,
                        tenant
                    ).catch(() => {
                        throw invalidValueError("category", categoryId);
                    });
                } else {
                    const err = requiredFieldError(fieldNames[i], "category");
                    throw new HttpError(err);
                }
                break;
            }
            case "technician": {
                const groupId = fields["group"];
                if (groupId) {
                    listData = getPossibleTechnicians(groupId, tenant).catch(
                        () => {
                            throw invalidValueError("group", groupId);
                        }
                    );
                } else {
                    const err = requiredFieldError(fieldNames[i], "group");
                    throw new HttpError(err);
                }
                break;
            }
            default: {
                listData = undefined;
            }
        }
        if (listData) {
            const item = listData.then((v) => ({
                field: fieldNames[i],
                data: v,
            }));
            result.push(item);
        }
    }
    return await Promise.all(result);
}

async function checkTicket(params: {
    ticketId: string;
    userId: string;
    tenant: string;
}): Promise<ITicket> {
    const match: FilterQuery<ITicket> = {
        id: params.ticketId,
        tenant: params.tenant,
    };
    const ticket = await Ticket.findOne(match);
    if (!ticket) {
        const resultError = error.notFound({
            param: "ticketId",
            location: "param",
            value: params.ticketId,
            message: `the ticket does not exist`,
        });
        throw new HttpError(resultError);
    }
    return ticket;
}
