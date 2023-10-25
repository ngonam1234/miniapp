import { error, HttpError, HttpStatus, Result, success } from "app";
import { FilterQuery, PipelineStage } from "mongoose";
import { parseQuery, parseSort, ParseSyntaxError } from "mquery";
import { v1 } from "uuid";
import { IType } from "../interfaces/models";
import { Type } from "../models";
import { checkTenantExist, getUserById } from "../service";
import {
    CreateReqBody,
    FindReqQuery,
    UpdateReqBody,
    ValidationReqBody,
} from "../interfaces/request";
import { isNullOrUndefined } from "utils";
import { UserResBody } from "../interfaces/response";

export async function findType(params: FindReqQuery): Promise<Result> {
    let filter: FilterQuery<IType> = { is_deleted: false };
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
    const result = await Type.aggregate(pipeline)
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

export async function getAllType(params: {
    tenant?: string;
    is_active?: boolean;
}): Promise<Result> {
    const match: FilterQuery<IType> = {
        is_deleted: false,
        is_active: true
    };
    if (!isNullOrUndefined(params.is_active)) {
        match.is_active = Boolean(params.is_active);
    }
    if (params.tenant) {
        match.$or = [{ type: "DEFAULT" }];
        match.$or.push({ tenant: params.tenant });
    }
    const result = await Type.aggregate([
        { $match: match },
        { $project: { _id: 0 } },
    ]);
    return success.ok(result);
}

export async function getTypeById(params: {
    typeId: string;
    userRoles: string[];
    userTenant?: string;
}): Promise<Result> {
    const match: FilterQuery<IType> = {
        id: params.typeId,
        // is_deleted: false,
    };
    if (!params.userRoles.includes("SA")) {
        match["$or"] = [
            { tenant: params.userTenant },
            { type: "DEFAULT" },
        ] as FilterQuery<IType>["$or"];
    }
    const result = await Type.findOne(match, { _id: 0 });
    if (!result) {
        throw new HttpError(
            error.invalidData({
                location: "query",
                param: "typeId",
                message: `Ticket type id ${params.typeId} does not exists`,
                value: params.typeId,
            })
        );
    } else {
        return success.ok(result);
    }
}

export async function createType(
    params: CreateReqBody & {
        userRoles: string[];
        userId: string;
        tenant: string;
    }
): Promise<Result> {
    await Promise.all([
        checkTenantExist(params.tenant),
        checkTypeExists({
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

    const type = new Type({
        id: v1(),
        name: params.name,
        description: params.description,
        is_active: params.is_active,
        created_by: user,
        created_time: new Date(),
        tenant: params.tenant,
    });

    const data = {
        ...type.toJSON(),
        _id: undefined,
    };

    await type.save();
    return success.created(data);
}

export async function updateType(
    params: UpdateReqBody & {
        typeId: string;
        userRoles: string[];
        userId: string;
        tenant?: string;
    }
): Promise<Result> {
    const { name, typeId } = params;
    const match: FilterQuery<IType> = {
        id: params.typeId,
        type: "CUSTOM", // only update custom type
        is_deleted: false,
    };
    params.tenant ? (match["tenant"] = params.tenant) : null;
    const errorMsg = error.invalidData({
        location: "query",
        param: "typeId",
        message: `Ticket type id ${params.typeId} does not exists`,
        value: params.typeId,
    });
    const type = await Type.findOne({
        id: params.typeId,
        is_deleted: false,
    });
    if (type) {
        await checkTypeExists({
            name,
            typeId,
            tenant: type.tenant,
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

        const type = await Type.findOneAndUpdate(
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
        if (!type) {
            throw new HttpError(errorMsg);
        } else {
            const data = {
                ...type.toJSON(),
                _id: undefined,
            };
            return success.ok(data);
        }
    }
}

export async function activationType(
    params: ValidationReqBody & {
        userRoles: string[];
        userTenant?: string;
    }
): Promise<Result> {
    const { ids, userRoles, userTenant, status } = params;
    const match: FilterQuery<IType> = {
        id: { $in: ids },
        type: "CUSTOM",
        is_deleted: false,
    };
    if (!userRoles.includes("SA")) {
        match.tenant = userTenant;
    }
    const result = await Type.updateMany(
        match,
        { is_active: status },
        { new: true }
    );
    if (result.matchedCount === 0) {
        throw new HttpError({
            status: HttpStatus.NOT_FOUND,
            code: "NOT_FOUND",
            description: {
                en: "Type not found",
                vi: "Loại sự cố không tồn tại",
            },
        });
    }
    const data = await Type.find(
        { id: { $in: ids } },
        { _id: 0, id: 1, name: 1, is_active: 1 }
    );
    return success.ok(data);
}

export async function deleteType(params: {
    typeId: string;
    userRoles: string[];
    userTenant?: string;
}): Promise<Result> {
    const { typeId, userRoles, userTenant } = params;
    const match: FilterQuery<IType> = {
        id: typeId,
        type: "CUSTOM",
        is_deleted: false,
    };
    if (!userRoles.includes("SA")) {
        match.tenant = userTenant;
    }
    const result = await Type.findOneAndUpdate(
        match,
        { is_deleted: true },
        { new: true }
    );
    if (!result) {
        throw new HttpError({
            status: HttpStatus.NOT_FOUND,
            code: "NOT_FOUND",
            description: {
                en: "Type not found",
                vi: "Loại sự cố không tồn tại",
            },
        });
    }
    const data = {
        ...result.toObject(),
        _id: undefined,
    };
    return success.ok(data);
}

export async function deleteManyType(params: {
    ids: string[];
    userRoles: string[];
    userTenant?: string;
}): Promise<Result> {
    const { ids, userRoles, userTenant } = params;
    const match: FilterQuery<IType> = {
        id: { $in: ids },
        type: "CUSTOM",
        is_deleted: false,
    };
    if (!userRoles.includes("SA")) {
        match.tenant = userTenant;
    }
    const result = await Type.updateMany(
        match,
        { is_deleted: true },
        { new: true }
    );
    if (result.matchedCount === 0) {
        throw new HttpError({
            status: HttpStatus.NOT_FOUND,
            code: "NOT_FOUND",
            description: {
                en: "Type not found",
                vi: "Loại sự cố không tồn tại",
            },
        });
    }
    const data = await Type.find(
        { id: { $in: ids } },
        { _id: 0, id: 1, name: 1, is_active: 1 }
    );
    return success.ok(data);
}

async function checkTypeExists(params: {
    name: string;
    typeId?: string;
    tenant?: string;
}): Promise<void> {
    const match: FilterQuery<IType> = {
        name: {
            $regex: `^${params.name}$`,
            $options: "i",
        },
        is_deleted: false,
    };
    params.tenant ? (match.tenant = params.tenant) : null;
    const type = await Type.findOne(match);
    if (type) {
        if (params.typeId === type.id) {
            return;
        }
        throw new HttpError({
            status: HttpStatus.BAD_REQUEST,
            code: "INVALID_DATA",
            description: {
                en: "Ticket type already exists",
                vi: "Loại sự cố đã tồn tại",
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
