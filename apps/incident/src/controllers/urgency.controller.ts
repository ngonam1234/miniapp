import {
    error,
    HttpError,
    HttpStatus,
    Result,
    ResultSuccess,
    success,
} from "app";
import { FilterQuery, PipelineStage } from "mongoose";
import { parseQuery, parseSort, ParseSyntaxError } from "mquery";
import { IUrgency } from "../interfaces/models";
import { PriorityMatrix, Urgency } from "../models";
import {
    CreateReqBody,
    FindReqQuery,
    UpdateReqBody,
    ValidationReqBody,
} from "../interfaces/request";
import { checkTenantExist, getUserById } from "../service";
import { v1 } from "uuid";
import { isNullOrUndefined } from "utils";
import { IPriorityMatrix } from "../interfaces/models/priority-matrix";
import { UserResBody } from "../interfaces/response";

export async function findUrgency(params: FindReqQuery): Promise<Result> {
    let filter: FilterQuery<IUrgency> = { is_deleted: false };
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
    const result = await Urgency.aggregate(pipeline)
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

export async function getAllUrgency(params: {
    tenant?: string;
    is_active?: boolean;
}): Promise<Result> {
    const match: FilterQuery<IUrgency> = {
        is_active: true, 
        is_deleted: false
    };
    if (!isNullOrUndefined(params.is_active)) {
        match.is_active = Boolean(params.is_active);
    }
    if (params.tenant) {
        match.$or = [{ type: "DEFAULT" }];
        match.$or.push({ tenant: params.tenant });
    }
    const result = await Urgency.aggregate([
        { $match: match },
        { $project: { _id: 0 } },
    ]);
    return success.ok(result);
}

export async function getUrgencyById(params: {
    urgencyId: string;
    userRoles: string[];
    userTenant?: string;
}): Promise<ResultSuccess> {
    const match: FilterQuery<IUrgency> = {
        id: params.urgencyId,
        // is_deleted: false,
    };
    if (!params.userRoles.includes("SA")) {
        match.$or = [
            { tenant: params.userTenant },
            { type: "DEFAULT" },
        ] as FilterQuery<IUrgency>["$or"];
    }
    const result = await Urgency.findOne(match, { _id: 0 });
    if (!result) {
        throw new HttpError(
            error.invalidData({
                location: "query",
                param: "urgencyId",
                message: `Ticket urgency id ${params.urgencyId} does not exists`,
                value: params.urgencyId,
            })
        );
    }
    return success.ok(result);
}

export async function createUrgency(
    params: CreateReqBody & {
        userRoles: string[];
        userId: string;
        tenant: string;
    }
): Promise<Result> {
    await Promise.all([
        checkTenantExist(params.tenant),
        checkUrgencyExist({
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

    const urgency = new Urgency({
        id: v1(),
        name: params.name,
        description: params.description,
        is_active: params.is_active,
        created_time: new Date(),
        created_by: user,
        tenant: params.tenant,
    });

    const data = {
        ...urgency.toJSON(),
        _id: undefined,
    };

    await urgency.save();
    return success.created(data);
}

export async function updateUrgency(
    params: UpdateReqBody & {
        urgencyId: string;
        userRoles: string[];
        userId: string;
        tenant?: string;
    }
): Promise<Result> {
    const { name, description, is_active, urgencyId, tenant } = params;
    const match: FilterQuery<IUrgency> = {
        id: urgencyId,
        type: "CUSTOM", // only update custom urgency
        is_deleted: false,
    };
    tenant ? (match["tenant"] = tenant) : null;
    const errorMsg = error.invalidData({
        location: "query",
        param: "urgencyId",
        message: `Ticket urgency id ${urgencyId} does not exists`,
        value: urgencyId,
    });
    const urgency = await Urgency.findOne({
        id: urgencyId,
        is_deleted: false,
    });
    if (urgency) {
        await checkUrgencyExist({
            name,
            urgencyId,
            tenant: urgency.tenant,
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

        const urgency = await Urgency.findOneAndUpdate(
            match,
            {
                $set: {
                    name,
                    description,
                    is_active,
                },
            },
            { new: true }
        );
        if (!urgency) {
            throw new HttpError(errorMsg);
        } else {
            const filter: FilterQuery<IPriorityMatrix> = {
                urgency: urgencyId,
            };
            const update = {
                $set: {
                    "impact_priority_list.$[].priority": null,
                },
            };
            await PriorityMatrix.updateMany(filter, update, { new: true });

            const data = {
                ...urgency.toJSON(),
                _id: undefined,
            };
            return success.ok(data);
        }
    }
}

export async function activationUrgency(
    params: ValidationReqBody & {
        userRoles: string[];
        userTenant?: string;
    }
): Promise<Result> {
    const { ids, userRoles, userTenant, status } = params;
    const match: FilterQuery<IUrgency> = {
        id: { $in: ids },
        type: "CUSTOM",
        is_deleted: false,
    };
    if (!userRoles.includes("SA")) {
        match.tenant = userTenant;
    }
    const result = await Urgency.updateMany(
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
                en: "Urgency not found",
                vi: "Mức độ khẩn cấp không tồn tại",
            },
        });
    }
    const data = await Urgency.find(
        { id: { $in: ids } },
        { _id: 0, id: 1, name: 1, is_active: 1 }
    );
    return success.ok(data);
}

export async function deleteUrgency(params: {
    urgencyId: string;
    userRoles: string[];
    userTenant?: string;
}): Promise<Result> {
    const { urgencyId, userRoles, userTenant } = params;
    const match: FilterQuery<IUrgency> = {
        id: urgencyId,
        type: "CUSTOM",
        is_deleted: false,
    };
    if (!userRoles.includes("SA")) {
        match.tenant = userTenant;
    }
    const result = await Urgency.findOneAndUpdate(
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
                en: "Urgency not found",
                vi: "Mức độ khẩn cấp không tồn tại",
            },
        });
    }

    const filter: FilterQuery<IPriorityMatrix> = {
        urgency: params.urgencyId,
    };
    const update = {
        $set: {
            "impact_priority_list.$[].priority": null,
        },
    };
    await PriorityMatrix.updateMany(filter, update, { new: true });

    const data = {
        ...result.toObject(),
        _id: undefined,
    };
    return success.ok(data);
}

export async function deleteManyUrgency(params: {
    ids: string[];
    userRoles: string[];
    userTenant?: string;
}): Promise<Result> {
    const { ids, userRoles, userTenant } = params;
    const match: FilterQuery<IUrgency> = {
        id: { $in: ids },
        type: "CUSTOM",
        is_deleted: false,
    };
    if (!userRoles.includes("SA")) {
        match.tenant = userTenant;
    }
    const result = await Urgency.updateMany(
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
                en: "Urgency not found",
                vi: "Mức độ khẩn cấp không tồn tại",
            },
        });
    }
    const data = await Urgency.find(
        { id: { $in: ids } },
        { _id: 0, id: 1, name: 1, is_active: 1 }
    );
    return success.ok(data);
}

async function checkUrgencyExist(params: {
    name: string;
    urgencyId?: string;
    tenant?: string;
}): Promise<void> {
    const match: FilterQuery<IUrgency> = {
        name: {
            $regex: `^${params.name}$`,
            $options: "i",
        },
        is_deleted: false,
    };
    params.tenant ? (match.tenant = params.tenant) : null;
    const urgency = await Urgency.findOne(match);
    if (urgency) {
        if (params.urgencyId === urgency.id) {
            return;
        }
        throw new HttpError({
            status: HttpStatus.BAD_REQUEST,
            code: "INVALID_DATA",
            description: {
                en: "Urgency already exists",
                vi: "Mức độ khẩn cấp đã tồn tại",
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
