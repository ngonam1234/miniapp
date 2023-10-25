import { error, HttpError, HttpStatus, Result, success } from "app";
import mongoose, { FilterQuery, PipelineStage } from "mongoose";
import { parseQuery, parseSort, ParseSyntaxError } from "mquery";
import { v1 } from "uuid";
import { ITenant } from "../interfaces/models";
import Tenant from "../models/tenant";
import { updateTenantActivation } from "../services";

export async function createTenant(params: {
    code: string;
    name?: string;
    description?: string;
    phone?: string;
    email?: string;
    admin_id?: string;
    is_active: boolean;
}): Promise<Result> {
    const existedTenat = await Tenant.findOne({
        code: {
            $regex: `^${params.code}$`,
            $options: "i",
        },
    });
    if (!existedTenat) {
        const tenant = new Tenant({
            id: v1(),
            groups: [],
            services: [],
            name: params.name,
            code: params.code,
            phone: params.phone,
            email: params.email,
            description: params.description,
            admin_id: params.admin_id,
            created_time: new Date(),
            is_active: params.is_active,
        });
        await tenant.save();
        const data: Partial<ITenant> = tenant.toJSON();
        delete data._id;
        delete data.services;
        return success.created(data);
    } else {
        return error.invalidData({
            value: params.code,
            param: "code",
            message: `the tenant code already exists`,
            description: {
                vi: "Tên tenant bị trùng. Đề nghị kiểm tra lại thông tin",
                en: "The name of tenant already exists. Please verify the information",
            },
        });
    }
}

export async function getTenantBy(params: {
    type: string;
    key: string;
}): Promise<Result> {
    let match: {
        id?: string;
        code?: string;
    } = { id: params.key };
    if (params.type === "code") {
        match = { code: params.key };
    }
    const tenant = await Tenant.findOne(match, {
        _id: 0,
        groups: 0,
        services: 0,
    }).lean();
    if (tenant) {
        return success.ok(tenant);
    } else {
        return error.notFound({
            location: "path",
            param: params.type,
            value: params.key,
            message: `the tenant ${params.key} does not exist`,
        });
    }
}

export async function findTenant(params: {
    query?: string;
    sort?: string;
    size: number;
    page: number;
}): Promise<Result> {
    const pipeline: PipelineStage[] = [];
    try {
        if (params.query) {
            let match: undefined | FilterQuery<ITenant> = undefined;
            match = parseQuery(params.query);
            if (match) {
                pipeline.push({ $match: match });
            }
        }
        if (params.sort) {
            let sort: undefined | Record<string, 1 | -1> = undefined;
            sort = parseSort(params.sort);
            if (sort) {
                pipeline.push({ $sort: sort });
            }
        }
    } catch (e) {
        const err = e as unknown as ParseSyntaxError;
        throw new HttpError(
            error.invalidData({
                location: "query",
                param: err.type,
                message: err.message,
                value: err.value,
            })
        );
    }
    const project = {
        _id: 0,
        id: 1,
        code: 1,
        name: 1,
        description: 1,
        address: 1,
        phone: 1,
        email: 1,
        number_of_user: 1,
        created_time: 1,
        is_active: 1,
    };
    const facetData =
        params.size == -1
            ? []
            : [
                  { $skip: params.size * params.page },
                  { $limit: params.size * 1 },
              ];
    const facet = {
        meta: [{ $count: "total" }],
        data: facetData,
    };
    pipeline.push({ $project: project }, { $facet: facet });
    const result = await Tenant.aggregate(pipeline)
        .collation({ locale: "vi" })
        .then((res) => res[0])
        .then((res) => {
            const total = !(res.meta.length > 0) ? 0 : res.meta[0].total;
            let totalPage = Math.ceil(total / params.size);
            totalPage = totalPage > 0 ? totalPage : 1;
            return {
                page: Number(params.page),
                total: total,
                total_page: totalPage,
                data: res.data,
            };
        });
    return success.ok(result);
}

export async function findTenant_(params: {
    query?: string;
    sort?: string;
    size: number;
    page: number;
}): Promise<Result> {
    const pipeline: PipelineStage[] = [];
    try {
        if (params.query) {
            let match: undefined | FilterQuery<ITenant> = undefined;
            match = parseQuery(params.query);
            if (match) {
                pipeline.push({ $match: match });
            }
        }
        if (params.sort) {
            let sort: undefined | Record<string, 1 | -1> = undefined;
            sort = parseSort(params.sort);
            if (sort) {
                pipeline.push({ $sort: sort });
            }
        }
    } catch (e) {
        const err = e as unknown as ParseSyntaxError;
        throw new HttpError(
            error.invalidData({
                location: "query",
                param: err.type,
                message: err.message,
                value: err.value,
            })
        );
    }
    const project = {
        _id: 0,
        id: 1,
        code: 1,
        name: 1,
        description: 1,
        address: 1,
        phone: 1,
        email: 1,
        number_of_user: 1,
        created_time: 1,
        is_active: 1,
    };
    const facetData =
        params.size == -1
            ? []
            : [
                  { $skip: params.size * params.page },
                  { $limit: params.size * 1 },
              ];
    const facet = {
        meta: [{ $count: "total" }],
        data: facetData,
    };
    pipeline.push({ $project: project }, { $facet: facet });
    const result = await Tenant.aggregate(pipeline)
        .collation({ locale: "vi" })
        .then((res) => res[0])
        .then((res) => {
            const total = !(res.meta.length > 0) ? 0 : res.meta[0].total;
            let totalPage = Math.ceil(total / params.size);
            totalPage = totalPage > 0 ? totalPage : 1;
            return {
                page: Number(params.page),
                total: total,
                total_page: totalPage,
                data: res.data,
            };
        });
    return success.ok(result);
}

export async function updateTenant(params: {
    type: string;
    key: string;
    name?: string;
    description?: string;
    address?: string;
    email?: string;
    phone?: string;
    is_active?: boolean;
}): Promise<Result> {
    let match: { id?: string; code?: string } = { id: params.key };
    if (params.type === "code") {
        match = { code: params.key };
    }

    const session = await Tenant.startSession();
    session.startTransaction();
    const tenant = await Tenant.findOneAndUpdate(
        match,
        {
            name: params.name,
            description: params.description,
            address: params.address,
            is_active: params.is_active,
            phone: params.phone,
            email: params.email,
        },
        {
            session,
            returnOriginal: false,
            projection: {
                _id: 0,
                services: 0,
                groups: 0,
            },
        }
    );
    if (!tenant) {
        return error.notFound({
            location: "path",
            param: params.type,
            value: params.key,
            message: `the tenant ${params.key} does not exist`,
        });
    }

    if (params.is_active !== undefined && params.is_active !== null) {
        const response = await updateTenantActivation({
            tenants: [tenant.code],
            status: params.is_active,
        });
        if (response.status !== 200) {
            await session.abortTransaction();
            session.endSession();
            return error.service(response.path);
        }
    }
    await session.commitTransaction();
    session.endSession();
    return success.ok(tenant);
}

export async function findTenantByEmail(params: {
    email: string;
}): Promise<Result> {
    const tenant = await Tenant.findOne(
        { email: { $regex: params.email.split("@")[1] } },
        { _id: 0, code: 1, is_active: 1 }
    );
    if (tenant) {
        return success.ok(tenant);
    } else {
        return success.ok({ type: "Tenant" });
    }
}

export async function increaseUser(
    params: {
        tenant: string;
        amount: number;
    }[]
): Promise<Result> {
    const session = await mongoose.startSession();
    session.startTransaction();
    const updatedFails: string[] = [];
    let isUpdateOke = true;
    for (let i = 0; i < params.length; i++) {
        const item = params[i];
        const tenant = await Tenant.findOneAndUpdate(
            { code: item.tenant },
            { $inc: { number_of_user: item.amount } },
            { new: true, session: session }
        );
        if (!tenant) {
            isUpdateOke = false;
            await session.abortTransaction();
            await session.endSession();
            updatedFails.push(item.tenant);
            break;
        }
    }
    if (isUpdateOke) {
        await session.commitTransaction();
        await session.endSession();
        return success.ok({ updated: params.length });
    } else {
        return error.invalidData({
            location: "path",
            param: "data.tenant",
            value: `${updatedFails.join(",")}`,
            message: `tenants do not exist`,
        });
    }
}

export async function getTenantByCodes(params: {
    codes: string[];
}): Promise<Result> {
    const tenants = await Tenant.find(
        {
            code: { $in: params.codes },
        },
        { _id: 0, services: 0 }
    )?.lean();
    return success.ok(tenants);
}

export async function updateActivation(params: {
    codes: string[];
    status: boolean;
}): Promise<Result> {
    const uniqueCodes: string[] = [...new Set(params.codes)];
    const session = await mongoose.startSession();
    session.startTransaction();
    const updateResult = await Tenant.updateMany(
        { code: { $in: uniqueCodes } },
        { $set: { is_active: params.status } },
        { session: session, new: true }
    );
    const matched = updateResult.matchedCount;
    if (matched === uniqueCodes.length) {
        const response = await updateTenantActivation({
            tenants: uniqueCodes,
            status: params.status,
        });
        if (response.status !== 200) {
            await session.abortTransaction();
            session.endSession();
            return error.service(response.path);
        }
        await session.commitTransaction();
        await session.endSession();
        return success.ok({ updated: matched });
    } else {
        await session.abortTransaction();
        await session.endSession();
        return error.invalidData({
            location: "body",
            param: "codes",
            value: params.codes,
            message: "some tenant codes do not exist",
        });
    }
}

export async function checkTenantByName(params: {
    name: string;
}): Promise<void> {
    const match: {
        name?: string;
    } = { name: params.name };

    const tenant = await Tenant.findOne(match, {
        _id: 0,
        groups: 0,
        services: 0,
    }).lean();
    if (!tenant) {
        throw new HttpError({
            status: HttpStatus.BAD_REQUEST,
            code: "INVALID_DATA",
            description: {
                en: "tenant does not exist",
                vi: "tenant không tồn tại",
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

export async function checkTenantByCode(params: {
    code: string;
}): Promise<void> {
    const match: {
        code?: string;
    } = { code: params.code };

    const tenant = await Tenant.findOne(match, {
        _id: 0,
        groups: 0,
        services: 0,
    }).lean();
    if (!tenant) {
        throw new HttpError({
            status: HttpStatus.BAD_REQUEST,
            code: "INVALID_DATA",
            description: {
                en: "tenant does not exist",
                vi: "tenant không tồn tại",
            },
            errors: [
                {
                    param: "code",
                    location: "body",
                    value: params.code,
                },
            ],
        });
    }
}
