import { error, HttpError, HttpStatus, Result, success } from "app";
import { FilterQuery, PipelineStage } from "mongoose";
import { parseQuery, parseSort, ParseSyntaxError } from "mquery";
import { IImpact } from "../interfaces/models";
import { Impact, PriorityMatrix } from "../models";
import {
    CreateReqBody,
    UpdateReqBody,
    ValidationReqBody,
} from "../interfaces/request";
import { v1 } from "uuid";
import { checkTenantExist, getUserById } from "../service";
import { isNullOrUndefined } from "utils";
import { IPriorityMatrix } from "../interfaces/models/priority-matrix";
import { UserResBody } from "../interfaces/response";

export async function findImpact(params: {
    query?: string;
    sort?: string;
    size: number;
    page: number;
    tenant?: string;
}): Promise<Result> {
    let filter: FilterQuery<IImpact> = { is_deleted: false };
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
    const result = await Impact.aggregate(pipeline)
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

export async function getAllImpact(params: {
    tenant?: string;
    is_active?: boolean;
}): Promise<Result> {
    const match: FilterQuery<IImpact> = {
        is_deleted: false,
        is_active: true,
    };
    if (!isNullOrUndefined(params.is_active)) {
        match.is_active = Boolean(params.is_active);
    }
    if (params.tenant) {
        match.$or = [{ type: "DEFAULT" }];
        match.$or.push({ tenant: params.tenant });
    }
    const result = await Impact.aggregate([
        { $match: match },
        { $project: { _id: 0 } },
    ]);
    return success.ok(result);
}

export async function getImpactById(params: {
    impactId: string;
    userRoles: string[];
    userTenant?: string;
}): Promise<Result> {
    const match: FilterQuery<IImpact> = {
        id: params.impactId,
        // is_deleted: false,
    };
    if (!params.userRoles.includes("SA")) {
        match["$or"] = [
            { tenant: params.userTenant },
            { type: "DEFAULT" },
        ] as FilterQuery<IImpact>["$or"];
    }
    const result = await Impact.findOne(match, { _id: 0 });
    if (!result) {
        throw new HttpError(
            error.invalidData({
                location: "query",
                param: "impactId",
                message: `the impact does not exists`,
                value: params.impactId,
            })
        );
    } else {
        return success.ok(result);
    }
}

export async function createImpact(
    params: CreateReqBody & {
        userRoles: string[];
        userId: string;
        tenant: string;
    }
): Promise<Result> {
    await Promise.all([
        checkTenantExist(params.tenant),
        checkImpactExists({
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

    const impact = new Impact({
        id: v1(),
        name: params.name,
        description: params.description,
        is_active: params.is_active,
        created_time: new Date(),
        created_by: user,
        tenant: params.tenant,
    });

    const data = {
        ...impact.toJSON(),
        _id: undefined,
    };

    await impact.save();
    return success.created(data);
}

export async function updateImpact(
    params: UpdateReqBody & {
        impactId: string;
        userRoles: string[];
        userId: string;
        tenant?: string;
    }
): Promise<Result> {
    const { name, description, is_active, impactId, tenant } = params;
    const match: FilterQuery<IImpact> = {
        id: impactId,
        type: "CUSTOM", // only update custom impact
        is_deleted: false,
    };
    tenant ? (match["tenant"] = tenant) : null;
    const errorMsg = error.invalidData({
        location: "query",
        param: "impactId",
        message: `Ticket impact id ${impactId} does not exists`,
        value: impactId,
    });
    const impact = await Impact.findOne({
        id: impactId,
        is_deleted: false,
    });
    if (impact) {
        await checkImpactExists({
            name,
            impactId,
            tenant: impact.tenant,
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

        const impact = await Impact.findOneAndUpdate(
            match,
            {
                $set: {
                    name: params.name,
                    description: params.description,
                    is_active: params.is_active,
                    updated_time: new Date(),
                    updated_by: user,
                },
            },
            { new: true }
        );
        if (!impact) {
            throw new HttpError(errorMsg);
        } else {
            const filter: FilterQuery<IPriorityMatrix> = {
                impact_priority_list: {
                    $elemMatch: {
                        impact: impactId,
                    },
                },
            };
            const update = {
                $set: {
                    "impact_priority_list.$.priority": null,
                },
            };
            await PriorityMatrix.updateMany(filter, update, { new: true });

            const data = {
                ...impact.toJSON(),
                _id: undefined,
            };
            return success.ok(data);
        }
    }
}

export async function activationImpact(
    params: ValidationReqBody & {
        userRoles: string[];
        userTenant?: string;
    }
): Promise<Result> {
    const { ids, userRoles, userTenant, status } = params;
    const match: FilterQuery<IImpact> = {
        id: { $in: ids },
        type: "CUSTOM",
        is_deleted: false,
    };
    if (!userRoles.includes("SA")) {
        match.tenant = userTenant;
    }
    const result = await Impact.updateMany(
        match,
        { is_active: status },
        { new: true }
    );
    if (result.matchedCount === 0) {
        throw new HttpError({
            status: HttpStatus.NOT_FOUND,
            code: "NOT_FOUND",
            description: {
                en: "Impact not found",
                vi: "Mức độ ảnh hưởng không tồn tại",
            },
        });
    }
    const data = await Impact.find(
        { id: { $in: ids } },
        { _id: 0, id: 1, name: 1, is_active: 1 }
    );
    return success.ok(data);
}

export async function deleteImpact(params: {
    impactId: string;
    userRoles: string[];
    userTenant?: string;
}): Promise<Result> {
    const { impactId, userRoles, userTenant } = params;
    const match: FilterQuery<IImpact> = {
        id: impactId,
        type: "CUSTOM",
        is_deleted: false,
    };
    if (!userRoles.includes("SA")) {
        match.tenant = userTenant;
    }
    const result = await Impact.findOneAndUpdate(
        match,
        { is_deleted: true },
        { new: true }
    );
    if (!result) {
        throw new HttpError({
            status: HttpStatus.NOT_FOUND,
            code: "NOT_FOUND",
            description: {
                en: "Impact not found",
                vi: "Mức độ ảnh hưởng không tồn tại",
            },
        });
    }

    const filter: FilterQuery<IPriorityMatrix> = {
        impact_priority_list: {
            $elemMatch: {
                impact: params.impactId,
            },
        },
    };
    const update = {
        $set: {
            "impact_priority_list.$.priority": null,
        },
    };
    await PriorityMatrix.updateMany(filter, update, { new: true });

    const data = {
        ...result.toObject(),
        _id: undefined,
    };
    return success.ok(data);
}

export async function deleteManyImpact(params: {
    ids: string[];
    userRoles: string[];
    userTenant?: string;
}): Promise<Result> {
    const { ids, userRoles, userTenant } = params;
    const match: FilterQuery<IImpact> = {
        id: { $in: ids },
        type: "CUSTOM",
        is_deleted: false,
    };
    if (!userRoles.includes("SA")) {
        match.tenant = userTenant;
    }
    const result = await Impact.updateMany(
        match,
        { is_deleted: true },
        { new: true }
    );
    if (result.matchedCount === 0) {
        throw new HttpError({
            status: HttpStatus.NOT_FOUND,
            code: "NOT_FOUND",
            description: {
                en: "Impact not found",
                vi: "Mức độ ảnh hưởng không tồn tại",
            },
        });
    }
    const data = await Impact.find(
        { id: { $in: ids } },
        { _id: 0, id: 1, name: 1, is_active: 1 }
    );
    return success.ok(data);
}

async function checkImpactExists(params: {
    name: string;
    impactId?: string;
    tenant?: string;
}): Promise<void> {
    const match: FilterQuery<IImpact> = {
        name: {
            $regex: `^${params.name}$`,
            $options: "i",
        },
        is_deleted: false,
    };
    params.tenant ? (match.tenant = params.tenant) : null;
    const impact = await Impact.findOne(match);
    if (impact) {
        if (params.impactId === impact.id) {
            return;
        }
        throw new HttpError({
            status: HttpStatus.BAD_REQUEST,
            code: "INVALID_DATA",
            description: {
                en: "Impact already exists",
                vi: "Mức độ ảnh hưởng đã tồn tại",
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
