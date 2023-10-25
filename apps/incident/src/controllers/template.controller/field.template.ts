import { error, HttpError, HttpStatus, Result, success } from "app";
import { FilterQuery } from "mongoose";
import { ITemplate } from "../../interfaces/models";
import { Template } from "../../models";
import { findUser } from "../../service";
import {
    getDefaultStatus,
    getPossibleCategories,
    getPossibleChannels,
    getPossibleDepartments,
    getPossibleGroups,
    getPossibleImpacts,
    getPossibleServices,
    getPossibleSubCategories,
    getPossibleSubServices,
    getPossibleTechnicians,
    getPossibleTypes,
    getPossibleUrgencies,
} from "../common.controller";
import { getPriorityByImpactAndUrgency } from "../priority-matrix.controller";

export async function getTemplateStatus(params: {
    templateId: string;
    tenant?: string;
}): Promise<Result> {
    const template = await checkTemplate(params);
    if (!template.workflow) {
        return success.ok([]);
    }
    const status = await getDefaultStatus(template.workflow, params.tenant);
    return success.ok(status);
}

export async function getTemplateTypes(params: {
    templateId: string;
    tenant?: string;
}): Promise<Result> {
    const [result] = await Promise.all([
        getPossibleTypes(params.tenant),
        checkTemplate(params),
    ]);
    return success.ok(result);
}

export async function getTemplateChannels(params: {
    templateId: string;
    tenant?: string;
}): Promise<Result> {
    const [result] = await Promise.all([
        getPossibleChannels(params.tenant),
        checkTemplate(params),
    ]);
    return success.ok(result);
}

export async function getTemplatePriorities(params: {
    templateId: string;
    tenant?: string;
    impact: string;
    urgency: string;
}): Promise<Result> {
    const [result] = await Promise.all([
        getPriorityByImpactAndUrgency({
            impact: params.impact,
            urgency: params.urgency,
            tenant: params.tenant as string,
        }),
        checkTemplate(params),
    ]);
    return success.ok(result);
}

export async function getTemplateUrgencis(params: {
    templateId: string;
    tenant?: string;
}): Promise<Result> {
    const [result] = await Promise.all([
        getPossibleUrgencies(params.tenant),
        checkTemplate(params),
    ]);
    return success.ok(result);
}
export async function getTemplateImpacts(params: {
    templateId: string;
    tenant?: string;
}): Promise<Result> {
    const [result] = await Promise.all([
        getPossibleImpacts(params.tenant),
        checkTemplate(params),
    ]);
    return success.ok(result);
}

export async function getTemplateServices(params: {
    templateId: string;
    tenant?: string;
    userRoles: string[];
}): Promise<Result> {
    const { tenant, userRoles } = params;
    const [result] = await Promise.all([
        getPossibleServices(tenant, userRoles),
        checkTemplate(params),
    ]);
    return success.ok(result);
}

export async function getTemplateCategories(params: {
    templateId: string;
    serviceId: string;
    tenant?: string;
}): Promise<Result> {
    const { serviceId, tenant } = params;
    try {
        const [result] = await Promise.all([
            getPossibleCategories(serviceId, tenant),
            checkTemplate(params),
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

export async function getTemplateSubCategories(params: {
    templateId: string;
    categoryId: string;
    tenant?: string;
}): Promise<Result> {
    try {
        const { categoryId, tenant } = params;
        const [result] = await Promise.all([
            getPossibleSubCategories(categoryId, tenant),
            checkTemplate(params),
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

export async function getTemplateSubService(params: {
    templateId: string;
    serviceId: string;
    tenant?: string;
}): Promise<Result> {
    try {
        const { tenant, serviceId } = params;
        const [result] = await Promise.all([
            getPossibleSubServices(serviceId, tenant),
            checkTemplate(params),
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

export async function getTemplateGroups(params: {
    templateId: string;
    tenant?: string;
}): Promise<Result> {
    const tenant = params.tenant;
    const [result] = await Promise.all([
        getPossibleGroups(tenant),
        checkTemplate(params),
    ]);
    return success.ok(result);
}

export async function getTemplateRequester(params: {
    templateId: string;
    tenant: string;
    query?: string;
}): Promise<Result> {
    // TODO FIX function findUser
    const [response] = await Promise.all([
        findUser(params.tenant, params.query, true),
        checkTemplate(params),
    ]);
    if (response.body) {
        return success.ok(response.body);
    } else {
        // ignore errors
        return success.ok([]);
    }
}

export async function getTemplateTechnicians(params: {
    templateId: string;
    tenant?: string;
    groupId: string;
}): Promise<Result> {
    try {
        const { groupId, tenant } = params;
        const [techs] = await Promise.all([
            getPossibleTechnicians(groupId, tenant),
            checkTemplate(params),
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

async function checkTemplate(params: {
    templateId: string;
    tenant?: string;
}): Promise<ITemplate> {
    const match: FilterQuery<ITemplate> = {
        id: params.templateId,
        is_active: true,
    };
    if (params.tenant) {
        match.$or = [{ tenant: params.tenant }, { type: "DEFAULT" }];
    }
    const template = await Template.findOne(match);
    if (!template) {
        const resultError = error.notFound({
            param: "templateId",
            location: "param",
            value: params.templateId,
            message: `the template does not exist`,
        });
        throw new HttpError(resultError);
    }
    return template;
}

export async function getTemplateDepartments(params: {
    tenant: string;
}): Promise<Result> {
    const response = await getPossibleDepartments(params.tenant);
    return success.ok(response);
}
