import { error, HttpError, HttpStatus, Result, success } from "app";
import { FilterQuery, PipelineStage } from "mongoose";
import { parseQuery, parseSort, ParseSyntaxError } from "mquery";
import { IStatus } from "../interfaces/models";
import { Status } from "../models";
import {
    CreateStatusReqBody,
    FindReqQuery,
    ValidationReqBody,
} from "../interfaces/request";
import { UpdateListStatusReqBody } from "../interfaces/request/common.body";
import { v1 } from "uuid";
import { checkTenantExist, getUserById } from "../service";
import { UserResBody } from "../interfaces/response";

export async function findStatus(params: FindReqQuery): Promise<Result> {
    let filter: FilterQuery<IStatus> = { is_deleted: false };
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
        data: [
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
    const result = await Status.aggregate(pipeline)
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

export async function findStatusById(params: {
    statusId: string;
    userRoles: string[];
    userTenant?: string;
}): Promise<Result> {
    const { statusId, userRoles, userTenant } = params;
    const match: FilterQuery<IStatus> = {
        id: statusId,
        // is_deleted: false,
    };
    if (!userRoles.includes("SA")) {
        match.$or = [
            { tenant: userTenant },
            { type: "DEFAULT" },
        ] as FilterQuery<IStatus>["$or"];
    }
    const result = await Status.findOne(match, { _id: 0 });
    if (!result) {
        throw new HttpError(
            error.notFound({
                message: "Status not found",
            })
        );
    }
    return success.ok(result);
}

export async function createStatus(
    params: CreateStatusReqBody & {
        userRoles: string[];
        userTenant: string;
        userId: string;
    }
): Promise<Result> {
    await Promise.all([
        checkTenantExist(params.userTenant),
        checkStatusExists({ name: params.name, tenant: params.userTenant }),
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

    const status = new Status({
        id: v1(),
        name: params.name,
        description: params.description,
        is_active: params.is_active,
        count_time: params.count_time,
        created_time: new Date(),
        created_by: user,
        tenant: params.userTenant,
    });

    const data = {
        ...status.toJSON(),
        _id: undefined,
    };
    await status.save();
    return success.created(data);
}

export async function updateStatus(
    params: UpdateListStatusReqBody & {
        statusId: string;
        userRoles: string[];
        userTenant?: string;
        userId: string;
    }
): Promise<Result> {
    const {
        name,
        description,
        count_time,
        statusId,
        userRoles,
        is_active,
        userTenant,
        userId,
    } = params;
    if (name) {
        await checkStatusExists({ name, statusId, tenant: userTenant });
    }
    const match: FilterQuery<IStatus> = {
        id: statusId,
        type: "CUSTOM", // only update custom status
        is_deleted: false,
    };
    if (!userRoles.includes("SA")) {
        match.tenant = params.userTenant;
    }

    let user:
        | (Omit<UserResBody, "department"> & { department?: string })
        | undefined;
    const response = await getUserById(userId);
    if (response.body?.is_active) {
        delete response.body?.activities;
        user = {
            ...response.body,
            department: response.body.department?.id,
        };
    }

    const status = await Status.findOneAndUpdate(
        match,
        {
            name,
            description,
            count_time,
            is_active,
            updated_time: new Date(),
            updated_by: user,
        },
        { new: true }
    );
    if (!status) {
        throw new HttpError({
            status: HttpStatus.NOT_FOUND,
            code: "NOT_FOUND",
            description: {
                en: "Status not found",
                vi: "Trạng thái không tồn tại",
            },
        });
    }
    return success.ok(status);
}

async function checkStatusExists(params: {
    name: string;
    statusId?: string;
    tenant?: string;
}): Promise<void> {
    const match: FilterQuery<IStatus> = {
        name: {
            $regex: `^${params.name}$`,
            $options: "i",
        },
        is_deleted: false,
    };
    params.tenant ? (match.tenant = params.tenant) : null;
    const status = await Status.findOne(match);
    if (status) {
        if (params.statusId === status.id) {
            return;
        }
        throw new HttpError({
            status: HttpStatus.BAD_REQUEST,
            code: "INVALID_DATA",
            description: {
                en: "Status already exists",
                vi: "Trạng thái đã tồn tại",
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

export async function activationStatus(
    params: ValidationReqBody & {
        userRoles: string[];
        userTenant?: string;
    }
): Promise<Result> {
    const { ids, userRoles, userTenant, status } = params;
    const match: FilterQuery<IStatus> = {
        id: { $in: ids },
        type: "CUSTOM",
        is_deleted: false,
    };
    if (!userRoles.includes("SA")) {
        match.tenant = userTenant;
    }
    const result = await Status.updateMany(
        match,
        {
            is_active: status,
        },
        { new: true }
    );
    if (result.matchedCount === 0) {
        throw new HttpError({
            status: HttpStatus.NOT_FOUND,
            code: "NOT_FOUND",
            description: {
                en: "Status not found",
                vi: "Trạng thái không tồn tại",
            },
        });
    }
    const data = await Status.find(
        { id: { $in: ids } },
        { _id: 0, id: 1, name: 1, is_active: 1 }
    );
    return success.ok(data);
}

export async function deleteStatus(params: {
    statusId: string;
    userRoles: string[];
    userTenant?: string;
}): Promise<Result> {
    const { statusId, userRoles, userTenant } = params;
    const match: FilterQuery<IStatus> = {
        id: statusId,
        type: "CUSTOM",
        is_deleted: false,
    };
    if (!userRoles.includes("SA")) {
        match.tenant = userTenant;
    }
    const result = await Status.findOneAndUpdate(
        match,
        {
            is_deleted: true,
        },
        { new: true }
    );
    if (!result) {
        throw new HttpError({
            status: HttpStatus.NOT_FOUND,
            code: "NOT_FOUND",
            description: {
                en: "Status not found",
                vi: "Trạng thái không tồn tại",
            },
        });
    }
    const data = {
        ...result.toObject(),
        _id: undefined,
    };
    return success.ok(data);
}

export async function deleteManyStatus(params: {
    ids: string[];
    userRoles: string[];
    userTenant?: string;
}): Promise<Result> {
    const { ids, userRoles, userTenant } = params;
    const match: FilterQuery<IStatus> = {
        id: { $in: ids },
        type: "CUSTOM",
        is_deleted: false,
    };
    if (!userRoles.includes("SA")) {
        match.tenant = userTenant;
    }
    const result = await Status.updateMany(
        match,
        {
            is_deleted: true,
        },
        { new: true }
    );
    if (result.matchedCount === 0) {
        throw new HttpError({
            status: HttpStatus.NOT_FOUND,
            code: "NOT_FOUND",
            description: {
                en: "Status not found",
                vi: "Trạng thái không tồn tại",
            },
        });
    }
    const data = await Status.find(
        { id: { $in: ids } },
        { _id: 0, id: 1, name: 1, is_active: 1 }
    );
    return success.ok(data);
}
