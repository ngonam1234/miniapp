import { error, HttpError, HttpStatus } from "app";
import { FilterQuery } from "mongoose";
import { equal, parse } from "utils";
import {
    IChannel,
    IPeople,
    INodeDetail,
    IWorkflowDetail,
    ITemplateDetail,
    ILayoutItemDetail,
    TypeEnum,
} from "../interfaces/models";
import { Channel, Priority, Status, Type, Workflow } from "../models";
import {
    getAllGroup,
    getServices,
    getCategories,
    getGroupMembers,
    getSubCategories,
    getSubServices,
    getSubServicesL2,
    getDepartments,
} from "../service";
import { workflowDetailPipeline } from "./workflow.controller";
import { ITaskType } from "../interfaces/models/task-type";
import TaskType from "../models/task-type";
import { GetDepartmentResBody } from "../interfaces/response";

export async function getPossibleStatus(
    workflow: IWorkflowDetail,
    currentStatus?: string
): Promise<{ id: string; name: string; description: string }[]> {
    const result: { id: string; name: string; description: string }[] = [];
    const currentNode = currentStatus
        ? workflow.nodes.find((n) => n.status?.id === currentStatus)
        : undefined;
    const possibleNode: INodeDetail[] = [];
    if (currentNode && currentStatus) {
        possibleNode.push(currentNode);
        const possibleEdges = workflow.edges.filter(
            (e) => e.source === currentNode.id
        );
        possibleEdges.forEach((edge) => {
            for (let i = 0; i < workflow.nodes.length; i++) {
                const element = workflow.nodes[i];
                if (element.status && element.id === edge.target) {
                    possibleNode.push(element);
                }
            }
        });
    } else {
        possibleNode.push(...workflow.nodes);
    }
    possibleNode.forEach((e) => {
        const existedNode = result.find((i) => i.id === e.status?.id);
        if (!existedNode && e.status) {
            result.push({
                id: e.status.id,
                name: e.status.name,
                description: e.status.description,
            });
        }
    });
    return result;
}

export async function getDefaultStatus(
    workflowId: string,
    tenant?: string
): Promise<{ id: string; name: string }[]> {
    const pipeline = workflowDetailPipeline({
        workflowId: workflowId,
        tenant: tenant,
    });
    const workflows: IWorkflowDetail[] = await Workflow.aggregate(pipeline);
    const workflow: IWorkflowDetail | undefined = workflows[0];
    const sourceNode = workflow.nodes.find((n) => n.type === "START");
    const edge = workflow.edges.find((e) => e.source === sourceNode?.id);
    const targetNode = workflow.nodes.find((n) => n.id === edge?.target);
    const status = await Status.findOne({ id: targetNode?.status?.id });
    const result = status ? [{ id: status.id, name: status.name }] : [];
    return result;
}

export async function getPossibleTypes(
    tenant?: string
): Promise<{ id: string; name: string }[]> {
    const type = TypeEnum.DEFAULT;
    const match: FilterQuery<IChannel> = {
        is_active: true,
        is_deleted: false,
    };
    tenant && (match.$or = [{ tenant }, { type }]);
    const types = await Type.aggregate([
        { $match: match },
        {
            $project: {
                _id: 0,
                id: 1,
                name: 1,
            },
        },
    ]);
    return types;
}

export async function getPossibleTaskTypes(
    tenant?: string
): Promise<{ id: string; name: string }[]> {
    const match: FilterQuery<ITaskType> = {
        is_active: true,
        is_deleted: false,
    };
    tenant && (match.tenant = tenant);
    const task_types = await TaskType.aggregate([
        { $match: match },
        {
            $project: {
                _id: 0,
                id: 1,
                name: 1,
            },
        },
    ]);
    return task_types;
}

export async function getPossibleChannels(
    tenant?: string
): Promise<{ id: string; name: string }[]> {
    const type = TypeEnum.DEFAULT;
    const match: FilterQuery<IChannel> = {
        is_active: true,
        is_deleted: false,
    };
    tenant && (match.$or = [{ tenant }, { type }]);
    const channels = await Channel.aggregate([
        { $match: match },
        {
            $project: {
                _id: 0,
                id: 1,
                name: 1,
            },
        },
    ]);
    return channels;
}

export async function getPossiblePriorities(
    tenant?: string
): Promise<{ id: string; name: string }[]> {
    const type = TypeEnum.DEFAULT;
    const match: FilterQuery<IChannel> = {
        is_active: true,
        is_deleted: false,
    };
    tenant && (match.$or = [{ tenant }, { type }]);
    const priorities = await Priority.aggregate([
        { $match: match },
        {
            $project: {
                _id: 0,
                id: 1,
                name: 1,
            },
        },
    ]);
    return priorities;
}

export async function getPossibleGroups(
    tenant?: string
): Promise<{ id: string; name: string }[]> {
    let result: { id: string; name: string }[] = [];
    if (tenant) {
        const response = await getAllGroup({ tenant });
        if (response.body) {
            result = response.body.map(({ id, name }) => ({ id, name }));
        }
    }
    return result;
}

export async function getPossibleDepartments(
    tenant?: string
): Promise<{ id: string; name: string }[]> {
    let result: { id: string; name: string }[] = [];
    if (tenant) {
        const response = await getDepartments(tenant);
        if (response.body) {
            result = response.body.map((b: GetDepartmentResBody) => ({
                id: b.id,
                name: b.name,
            }));
        }
    }
    return result;
}

export async function getPossibleTechnicians(
    groupId: string,
    tenant?: string
): Promise<IPeople[]> {
    let result: IPeople[] = [];
    if (tenant) {
        const { body, status } = await getGroupMembers({
            tenant: tenant,
            group: groupId,
        });
        const isNotFound = status === HttpStatus.NOT_FOUND;
        if (body && !isNotFound) {
            result = body.filter((user) => user.is_active);
        } else {
            const err = error.notFound({
                location: "query",
                param: "groupId",
                value: groupId,
                message: "the group does not exist",
            });
            throw new HttpError(err);
        }
    }
    return result;
}

export async function getPossibleServices(
    tenant?: string,
    userRoles?: string[]
): Promise<{ id: string; name: string }[]> {
    let result: { id: string; name: string }[] = [];
    if (tenant) {
        const response = await getServices({ tenant });
        if (response.body) {
            result = response.body
                .filter((service) => {
                    const isEU = userRoles && userRoles[equal](["EU"]);
                    const euCondition = isEU
                        ? service.type === "BUSINESS_SERVICE"
                        : true;
                    return euCondition && service.is_active;
                })
                .map(({ id, name }) => ({ id, name }));
        }
    }
    return result;
}

export async function getPossibleCategories(
    serviceId: string,
    tenant?: string
): Promise<{ id: string; name: string }[]> {
    let result: { id: string; name: string }[] = [];
    if (tenant) {
        const { body, status } = await getCategories({
            tenant: tenant,
            service: serviceId,
        });
        const isNotFound = status === HttpStatus.NOT_FOUND;
        if (body && !isNotFound) {
            result = body
                .filter(({ is_deleted }) => !is_deleted)
                .map(({ id, name }) => ({ id, name }));
        } else {
            const err = error.notFound({
                location: "query",
                param: "serviceId",
                value: serviceId,
                message: "the service does not exist",
            });
            throw new HttpError(err);
        }
    }
    return result;
}

export async function getPossibleSubServices(
    serviceId: string,
    tenant?: string
): Promise<{ id: string; name: string }[]> {
    let result: { id: string; name: string }[] = [];
    if (tenant) {
        const { body, status } = await getSubServices({
            tenant: tenant,
            service: serviceId,
        });
        const isNotFound = status === HttpStatus.NOT_FOUND;
        if (body && !isNotFound) {
            result = body
                .filter(({ is_deleted }) => !is_deleted)
                .map(({ id, name }) => ({ id, name }));
        } else {
            const err = error.notFound({
                location: "query",
                param: "serviceId",
                value: serviceId,
                message: "the service does not exist",
            });
            throw new HttpError(err);
        }
    }
    return result;
}

export async function getPossibleSubServicesL2(
    sub_servieId: string
): Promise<{ id: string; name: string }[]> {
    let result: { id: string; name: string }[] = [];
    const { body, status } = await getSubServicesL2({
        sub_servies: sub_servieId,
    });
    const isNotFound = status === HttpStatus.NOT_FOUND;
    if (body && !isNotFound) {
        result = body
            .filter(({ is_deleted }) => !is_deleted)
            .map(({ id, name }) => ({ id, name }));
    } else {
        const err = error.notFound({
            location: "query",
            param: "categoryId",
            value: sub_servieId,
            message: "the category does not exist",
        });
        throw new HttpError(err);
    }
    return result;
}
export async function getPossibleSubCategories(
    categoryId: string,
    tenant?: string
): Promise<{ id: string; name: string }[]> {
    let result: { id: string; name: string }[] = [];
    if (tenant) {
        const { body, status } = await getSubCategories({
            tenant: tenant,
            category: categoryId,
        });
        const isNotFound = status === HttpStatus.NOT_FOUND;
        if (body && !isNotFound) {
            result = body
                .filter(({ is_deleted }) => !is_deleted)
                .map(({ id, name }) => ({ id, name }));
        } else {
            const err = error.notFound({
                location: "query",
                param: "categoryId",
                value: categoryId,
                message: "the category does not exist",
            });
            throw new HttpError(err);
        }
    }
    return result;
}
export function transformTemplate(params: {
    template: ITemplateDetail;
    resourceId: string;
    isEndUser: boolean;
}): {
    template: Omit<ITemplateDetail, "technician_layout" | "enduser_layout"> & {
        enduser_layout?: ILayoutItemDetail[];
        technician_layout?: ILayoutItemDetail[];
        layout: ILayoutItemDetail[];
    };
    datasource: {
        field: string;
        href: string;
        dependencies: string[];
    }[];
} {
    const datasource: {
        field: string;
        href: string;
        dependencies: string[];
    }[] = [];
    let objectTemplate = params.template;
    if (
        "toObject" in objectTemplate &&
        typeof objectTemplate.toObject === "function"
    ) {
        objectTemplate = objectTemplate.toObject();
    }
    const layoutItems: ILayoutItemDetail[] = params.isEndUser
        ? objectTemplate.enduser_layout
        : objectTemplate.technician_layout;
    layoutItems.forEach((item) => {
        if (item.field.datasource) {
            const field = item.field.name;
            const href = item.field.datasource.href[parse]({
                resource: "tickets",
                id: params.resourceId,
            });
            item.field.datasource.href = href;
            const dependencies = item.field.datasource.dependencies;
            datasource.push({ field, href, dependencies });
        }
    });
    return {
        template: {
            ...objectTemplate,
            enduser_layout: undefined,
            technician_layout: undefined,
            layout: layoutItems,
        },
        datasource: datasource,
    };
}
