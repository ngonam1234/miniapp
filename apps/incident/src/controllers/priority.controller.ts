import { error, HttpError, HttpStatus, Result, success } from "app";
import { FilterQuery, PipelineStage } from "mongoose";
import { parseQuery, parseSort, ParseSyntaxError } from "mquery";
import { IPriority } from "../interfaces/models";
import { Priority } from "../models";
import {
    CreateReqBody,
    FindReqQuery,
    UpdateReqBody,
    ValidationReqBody,
} from "../interfaces/request";
import { v1 } from "uuid";
import { checkTenantExist, getUserById } from "../service";
import { isNullOrUndefined } from "utils";
import { UserResBody } from "../interfaces/response";

export async function findPriority(params: FindReqQuery): Promise<Result> {
    let filter: FilterQuery<IPriority> = { is_deleted: false };
    let sort: Record<string, 1 | -1> = { created_time: -1 };
    if (params.tenant) {
        filter.$or = [{ tenant: params.tenant }, { type: "DEFAULT" }];
    }

    try {
        if (params.query) {
            const uFilter = parseQuery(params.query);
            filter = { $and: [filter, uFilter] };
        }
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

    const facet = {
        meta: [{ $count: "total" }],
        data:
            params.size == -1
                ? []
                : [
                      { $skip: params.size * params.page },
                      { $limit: params.size * 1 },
                  ],
    };
    const pipeline: PipelineStage[] = [
        { $match: filter },
        { $sort: sort },
        { $project: { _id: 0 } },
        { $facet: facet },
    ];
    const result = await Priority.aggregate(pipeline)
        .collation({ locale: "vi" })
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

export async function getAllPriority(params: {
    tenant?: string;
    is_active?: boolean;
}): Promise<Result> {
    const match: FilterQuery<IPriority> = {
        is_active: true,
        is_deleted: false,
    };
    if (!isNullOrUndefined(params.is_active)) {
        match.is_active = Boolean(params.is_active);
    }
    if (params.tenant) {
        match.$or = [{ type: "DEFAULT" }];
        match.$or.push({ tenant: params.tenant });
    }
    const result = await Priority.aggregate([
        { $match: match },
        { $project: { _id: 0 } },
    ]);
    return success.ok(result);
}

export async function getPriorityById(params: {
    priorityId: string;
    userRoles: string[];
    userTenant?: string;
}): Promise<Result> {
    const match: FilterQuery<IPriority> = {
        id: params.priorityId,
        // is_deleted: false,
    };
    if (!params.userRoles.includes("SA")) {
        match["$or"] = [
            { tenant: params.userTenant },
            { type: "DEFAULT" },
        ] as FilterQuery<IPriority>["$or"];
    }
    const result = await Priority.findOne(match, { _id: 0 });
    if (!result) {
        throw new HttpError(
            error.invalidData({
                location: "query",
                param: "priorityId",
                message: `the priority does not exists`,
                value: params.priorityId,
            })
        );
    } else {
        return success.ok(result);
    }
}

export async function createPriority(
    params: CreateReqBody & {
        userRoles: string[];
        userId: string;
        tenant: string;
    }
): Promise<Result> {
    await Promise.all([
        checkTenantExist(params.tenant),
        checkPriorityExists({
            name: params.name,
            tenant: params.tenant,
        }),
    ]);

    let user:
        | (Omit<UserResBody, "department"> & { department?: string })
        | undefined;
    const response = await getUserById(params.userId);
    if (response.body?.is_active) {
        delete response.body?.activities;
        user = {
            ...response.body,
            department: response.body.department?.id,
        };
    }

    const priority = new Priority({
        id: v1(),
        name: params.name,
        description: params.description,
        is_active: params.is_active,
        created_by: user,
        created_time: new Date(),
        tenant: params.tenant,
    });

    const data = {
        ...priority.toJSON(),
        _id: undefined,
    };

    await priority.save();
    return success.created(data);
}

export async function updatePriority(
    params: UpdateReqBody & {
        priorityId: string;
        userRoles: string[];
        userId: string;
        tenant?: string;
    }
): Promise<Result> {
    const { name, description, is_active, priorityId, tenant } = params;
    const match: FilterQuery<IPriority> = {
        id: priorityId,
        type: "CUSTOM", // only update custom priority
        is_deleted: false,
    };
    tenant ? (match["tenant"] = tenant) : null;
    const errorMsg = error.invalidData({
        location: "query",
        param: "priorityId",
        message: `Ticket priority id ${priorityId} does not exists`,
        value: priorityId,
    });
    const priority = await Priority.findOne({
        id: priorityId,
        is_deleted: false,
    });
    if (priority) {
        await checkPriorityExists({
            name,
            priorityId,
            tenant: priority.tenant,
        });
    }
    if (!match) {
        throw new HttpError(errorMsg);
    } else {
        let user:
            | (Omit<UserResBody, "department"> & { department?: string })
            | undefined;
        const response = await getUserById(params.userId);
        if (response.body?.is_active) {
            delete response.body?.activities;
            user = {
                ...response.body,
                department: response.body.department?.id,
            };
        }

        const priority = await Priority.findOneAndUpdate(
            match,
            {
                $set: {
                    name: params.name,
                    description: params.description,
                    is_active: params.is_active,
                    updated_by: user,
                    updated_time: new Date(),
                },
            },
            { new: true }
        );
        if (!priority) {
            throw new HttpError(errorMsg);
        } else {
            const data = {
                ...priority.toJSON(),
                _id: undefined,
            };
            return success.ok(data);
        }
    }
}

export async function activationPriority(
    params: ValidationReqBody & {
        userRoles: string[];
        userTenant?: string;
    }
): Promise<Result> {
    const { ids, userRoles, userTenant, status } = params;
    const match: FilterQuery<IPriority> = {
        id: { $in: ids },
        type: "CUSTOM",
        is_deleted: false,
    };
    if (!userRoles.includes("SA")) {
        match.tenant = userTenant;
    }
    const result = await Priority.updateMany(
        match,
        { is_active: status },
        { new: true }
    );
    if (result.matchedCount === 0) {
        throw new HttpError({
            status: HttpStatus.NOT_FOUND,
            code: "NOT_FOUND",
            description: {
                en: "Priority not found",
                vi: "Mức độ ưu tiên không tồn tại",
            },
        });
    }
    const data = await Priority.find(
        { id: { $in: ids } },
        { _id: 0, id: 1, name: 1, is_active: 1 }
    );
    return success.ok(data);
}

export async function deletePriority(params: {
    priorityId: string;
    userRoles: string[];
    userTenant?: string;
}): Promise<Result> {
    const { priorityId, userRoles, userTenant } = params;
    const match: FilterQuery<IPriority> = {
        id: priorityId,
        type: "CUSTOM",
        is_deleted: false,
    };
    if (!userRoles.includes("SA")) {
        match.tenant = userTenant;
    }
    const result = await Priority.findOneAndUpdate(
        match,
        { is_deleted: true },
        { new: true }
    );
    if (!result) {
        throw new HttpError({
            status: HttpStatus.NOT_FOUND,
            code: "NOT_FOUND",
            description: {
                en: "Priority not found",
                vi: "Mức độ ưu tiên không tồn tại",
            },
        });
    }
    const data = {
        ...result.toObject(),
        _id: undefined,
    };
    return success.ok(data);
}

export async function deleteManyPriority(params: {
    ids: string[];
    userRoles: string[];
    userTenant?: string;
}): Promise<Result> {
    const { ids, userRoles, userTenant } = params;
    const match: FilterQuery<IPriority> = {
        id: { $in: ids },
        type: "CUSTOM",
        is_deleted: false,
    };
    if (!userRoles.includes("SA")) {
        match.tenant = userTenant;
    }
    const result = await Priority.updateMany(
        match,
        { is_deleted: true },
        { new: true }
    );
    if (result.matchedCount === 0) {
        throw new HttpError({
            status: HttpStatus.NOT_FOUND,
            code: "NOT_FOUND",
            description: {
                en: "Priority not found",
                vi: "Mức độ ưu tiên không tồn tại",
            },
        });
    }
    const data = await Priority.find(
        { id: { $in: ids } },
        { _id: 0, id: 1, name: 1, is_active: 1 }
    );
    return success.ok(data);
}

async function checkPriorityExists(params: {
    name: string;
    priorityId?: string;
    tenant?: string;
}): Promise<void> {
    const match: FilterQuery<IPriority> = {
        name: {
            $regex: `^${params.name}$`,
            $options: "i",
        },
        is_deleted: false,
    };
    params.tenant ? (match.tenant = params.tenant) : null;
    const priority = await Priority.findOne(match);
    if (priority) {
        if (params.priorityId === priority.id) {
            return;
        }
        throw new HttpError({
            status: HttpStatus.BAD_REQUEST,
            code: "INVALID_DATA",
            description: {
                en: "Priority already exists",
                vi: "Mức độ ưu tiên đã tồn tại",
            },
            errors: [
                {
                    param: "name",
                    location: "body",
                    value: params.name,
                },
            ],
        });
    }
}
