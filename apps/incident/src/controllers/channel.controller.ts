import { error, HttpError, HttpStatus, Result, success } from "app";
import { FilterQuery, PipelineStage } from "mongoose";
import { parseQuery, parseSort, ParseSyntaxError } from "mquery";
import { isNullOrUndefined } from "utils";
import { v1 } from "uuid";
import { IChannel } from "../interfaces/models";
import {
    CreateReqBody,
    FindReqQuery,
    UpdateReqBody,
    ValidationReqBody,
} from "../interfaces/request";
import { UserResBody } from "../interfaces/response";
import { Channel } from "../models";
import { checkTenantExist, getUserById } from "../service";

export async function findChannel(params: FindReqQuery): Promise<Result> {
    let filter: FilterQuery<IChannel> = { is_deleted: false };
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
    const result = await Channel.aggregate(pipeline)
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

export async function getAllChannel(params: {
    tenant?: string;
    is_active?: boolean;
}): Promise<Result> {
    const match: FilterQuery<IChannel> = {
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
    const result = await Channel.aggregate([
        { $match: match },
        { $project: { _id: 0 } },
    ]);
    return success.ok(result);
}

export async function getChannelById(params: {
    channelId: string;
    userRoles: string[];
    userTenant?: string;
}): Promise<Result> {
    const match: FilterQuery<IChannel> = {
        id: params.channelId,
        // is_deleted: false,
    };
    const result = await Channel.findOne(match, { _id: 0 });
    if (!result) {
        throw new HttpError(
            error.invalidData({
                location: "query",
                param: "channelId",
                message: `the channel does not exists`,
                value: params.channelId,
            })
        );
    }
    return success.ok(result);
}

export async function createChannel(
    params: CreateReqBody & {
        userRoles: string[];
        userId: string;
        tenant: string;
    }
): Promise<Result> {
    await Promise.all([
        checkTenantExist(params.tenant),
        checkChannelExist({
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

    const channel = new Channel({
        id: v1(),
        name: params.name,
        description: params.description,
        is_active: params.is_active,
        created_by: user,
        created_time: new Date(),
        tenant: params.tenant,
    });

    const data = {
        ...channel.toJSON(),
        _id: undefined,
    };

    await channel.save();
    return success.created(data);
}

export async function updateChannel(
    params: UpdateReqBody & {
        channelId: string;
        userRoles: string[];
        userId: string;
        tenant?: string;
    }
): Promise<Result> {
    const { name, description, is_active, channelId, tenant } = params;
    const match: FilterQuery<IChannel> = {
        id: channelId,
        type: "CUSTOM", // only update custom channel
        is_deleted: false,
    };
    tenant && (match["tenant"] = tenant);
    const errorMsg = error.invalidData({
        location: "query",
        param: "channelId",
        message: `Ticket channel id ${channelId} does not exists`,
        value: channelId,
    });
    const channel = await Channel.findOne({
        id: channelId,
        is_deleted: false,
    });
    if (channel) {
        await checkChannelExist({
            name,
            channelId,
            tenant: channel.tenant,
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

        const channel = await Channel.findOneAndUpdate(
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
        if (!channel) {
            throw new HttpError(errorMsg);
        } else {
            const data = {
                ...channel.toJSON(),
                _id: undefined,
            };
            return success.ok(data);
        }
    }
}

export async function activationChannel(
    params: ValidationReqBody & {
        userRoles: string[];
        userTenant?: string;
    }
): Promise<Result> {
    const { ids, userRoles, userTenant, status } = params;
    const match: FilterQuery<IChannel> = {
        id: { $in: ids },
        type: "CUSTOM",
        is_deleted: false,
    };
    if (!userRoles.includes("SA")) {
        match.tenant = userTenant;
    }
    const result = await Channel.updateMany(
        match,
        { is_active: status },
        { new: true }
    );
    if (result.matchedCount === 0) {
        throw new HttpError({
            status: HttpStatus.NOT_FOUND,
            code: "NOT_FOUND",
            description: {
                en: "Channel not found",
                vi: "Kênh tiếp nhận không tồn tại",
            },
        });
    }
    const data = await Channel.find(
        { id: { $in: ids } },
        { _id: 0, id: 1, name: 1, is_active: 1 }
    );
    return success.ok(data);
}

export async function deleteChannel(params: {
    channelId: string;
    userRoles: string[];
    userTenant?: string;
}): Promise<Result> {
    const { channelId, userRoles, userTenant } = params;
    const match: FilterQuery<IChannel> = {
        id: channelId,
        type: "CUSTOM",
        is_deleted: false,
    };
    if (!userRoles.includes("SA")) {
        match.tenant = userTenant;
    }
    const result = await Channel.findOneAndUpdate(
        match,
        { is_deleted: true },
        { new: true }
    );
    if (!result) {
        throw new HttpError({
            status: HttpStatus.NOT_FOUND,
            code: "NOT_FOUND",
            description: {
                en: "Channel not found",
                vi: "Kênh tiếp nhận không tồn tại",
            },
        });
    }
    const data = {
        ...result.toObject(),
        _id: undefined,
    };
    return success.ok(data);
}

export async function deleteManyChannel(params: {
    ids: string[];
    userRoles: string[];
    userTenant?: string;
}): Promise<Result> {
    const { ids, userRoles, userTenant } = params;
    const match: FilterQuery<IChannel> = {
        id: { $in: ids },
        type: "CUSTOM",
        is_deleted: false,
    };
    if (!userRoles.includes("SA")) {
        match.tenant = userTenant;
    }
    const result = await Channel.updateMany(
        match,
        { is_deleted: true },
        { new: true }
    );
    if (result.matchedCount === 0) {
        throw new HttpError({
            status: HttpStatus.NOT_FOUND,
            code: "NOT_FOUND",
            description: {
                en: "Channel not found",
                vi: "Kênh tiếp nhận không tồn tại",
            },
        });
    }
    const data = await Channel.find(
        { id: { $in: ids } },
        { _id: 0, id: 1, name: 1, is_active: 1 }
    );
    return success.ok(data);
}

async function checkChannelExist(params: {
    name: string;
    channelId?: string;
    tenant?: string;
}): Promise<void> {
    const match: FilterQuery<IChannel> = {
        name: {
            $regex: `^${params.name}$`,
            $options: "i",
        },
        is_deleted: false,
    };
    params.tenant ? (match.tenant = params.tenant) : null;
    const channel = await Channel.findOne(match);
    if (channel) {
        if (params.channelId === channel.id) {
            return;
        }
        throw new HttpError({
            status: HttpStatus.BAD_REQUEST,
            code: "INVALID_DATA",
            description: {
                en: "Channel already exists",
                vi: "Kênh tiếp nhận đã tồn tại",
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
