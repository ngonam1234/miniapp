import { error, HttpError, HttpStatus, Result, success } from "app";
import { FilterQuery, PipelineStage, UpdateQuery } from "mongoose";
import { parseQuery, parseSort, ParseSyntaxError } from "mquery";
import { ICategory } from "../interfaces/models";
import { UserResBody } from "../interfaces/response";
import { IServiceModel, Service } from "../models";
import { getUserById } from "../services";
import { v1 } from "uuid";

export async function findCategory(params: {
    query?: string;
    sort?: string;
    size: number;
    page: number;
    userRoles: string[];
    userTenant?: string;
    userId: string;
}): Promise<Result> {
    const pipeline: PipelineStage[] = [
        {
            $project: {
                _id: 0,
                technician: 1,
                categories: 1,
                service: {
                    id: "$id",
                    type: "$type",
                    name: "$name",
                },
                tenant: 1,
                is_deleted: 1,
            },
        },
        { $unwind: "$categories" },
        {
            $match: {
                "categories.is_deleted": false,
                is_deleted: false,
            },
        },
        {
            $replaceRoot: {
                newRoot: {
                    $mergeObjects: ["$$ROOT", "$categories"],
                },
            },
        },
        { $project: { categories: 0, is_deleted: 0 } },
    ];
    let match: FilterQuery<IServiceModel> | undefined;
    let sort: undefined | Record<string, 1 | -1> = undefined;
    try {
        if (!params.userRoles.includes("SA")) {
            params.query = params.query
                ? `and(eq(tenant,"${params.userTenant}"),${params.query})`
                : `eq(tenant,"${params.userTenant}")`;
        }
        if (params.query) {
            match = parseQuery(params.query);
        }
        if (params.sort) {
            sort = parseSort(params.sort);
        }
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

    if (!params.userRoles.includes("SA") && !params.userRoles.includes("TA")) {
        const tmpCondition = {
            $or: [{ technician: params.userId }],
        };
        if (match?.$and && match?.$and.length > 0) {
            match.$and.push(tmpCondition);
        } else {
            if (match) {
                match = { $and: [match, tmpCondition] };
            } else {
                match = tmpCondition;
            }
        }
    }
    if (match) pipeline.push({ $match: match });
    if (sort) pipeline.push({ $sort: sort });

    const project = {
        id: 1,
        name: 1,
        type: 1,
        tenant: 1,
        service: 1,
        description: 1,
        created_time: 1,
        updated_time: 1,
        sub_categories: {
            $filter: {
                input: "$sub_categories",
                as: "sub_category",
                cond: { $eq: ["$$sub_category.is_deleted", false] },
            },
        },
    };
    const facet = {
        meta: [{ $count: "total" }],
        data: [
            { $skip: params.size * params.page },
            { $limit: params.size * 1 },
            {
                $project: {
                    sub_categories: {
                        is_deleted: 0,
                    },
                },
            },
        ],
    };
    pipeline.push({ $project: project });
    pipeline.push({ $facet: facet });
    const result = await Service.aggregate(pipeline)
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

export async function createCategory(params: {
    service: string;
    name: string;
    description?: string;
    technician?: string;
    userTenant?: string;
}): Promise<Result> {
    const match: FilterQuery<IServiceModel> = {
        id: params.service,
        is_deleted: false,
    };
    if (params.userTenant) {
        match.tenant = params.userTenant;
    }
    const service = await Service.findOne(match);
    if (!service) {
        return error.notFound({
            param: "serviceId",
            value: params.service,
            location: "params",
            message: `the service ${params.service} does not exist`,
        });
    }
    if (service.is_active === false) {
        return error.notFound({
            param: "serviceId",
            value: params.service,
            location: "params",
            message: `the service ${params.service} is inactive`,
        });
    }
    const categories = service.categories;
    if (categories.some((c) => c.name === params.name)) {
        return error.invalidData({
            param: "name",
            value: params.name,
            location: "body",
            message: `The category name ${params.name} already exists`,
        });
    }

    const category = {
        id: v1(),
        name: params.name,
        description: params.description,
        technician: params.technician,
        is_deleted: false,
        sub_categories: [],
    };

    const objCategory: Omit<ICategory, "technician" | "is_deleted"> & {
        technician?: UserResBody;
        is_deleted?: boolean;
    } = { ...category, technician: undefined, is_deleted: undefined };
    if (params.technician) {
        const response = await getUserById(params.technician);

        if (!response.body || response.status !== HttpStatus.OK) {
            return error.invalidData({
                location: "body",
                param: "technician",
                value: params.technician,
                message: `the technician id does not exist`,
            });
        }
        if (response.body.tenant !== service.tenant) {
            return error.invalidData({
                location: "body",
                param: "technician",
                value: params.technician,
                message: `the technician do not belong tenant ${service.tenant}`,
            });
        }
        if (response.body.is_active) {
            delete response.body?.activities;
            objCategory.technician = response.body;
        } else {
            return error.invalidData({
                location: "body",
                param: "technician",
                value: params.technician,
                message: `the technician is inactive`,
            });
        }
    }

    categories.push(category);
    await service.save();
    const result = {
        ...objCategory,
        service: service.id,
        tenant: service.tenant,
        type: service.type,
    };
    return success.created(result);
}

export async function createSubCategory(params: {
    categoryId: string;
    name: string;
    description?: string;
    userTenant?: string;
}): Promise<Result> {
    const match: FilterQuery<IServiceModel> = {
        categories: {
            $elemMatch: {
                id: params.categoryId,
                is_deleted: false,
            },
        },
        is_deleted: false,
    };
    if (params.userTenant) {
        match.tenant = params.userTenant;
    }
    const service = await Service.findOne(match);
    const category = service?.categories.find(
        (c) => c.id === params.categoryId
    );
    if (!service || !category) {
        return error.notFound({
            location: "params",
            param: "categoryId",
            value: params.categoryId,
            message: `the category ${params.categoryId} does not exist`,
        });
    }
    if (service.is_active === false) {
        return error.notFound({
            param: "categoryId",
            value: service.id,
            location: "params",
            message: `the service ${service.id} is inactive`,
        });
    }
    const sub_categories = category?.sub_categories
        ? category.sub_categories
        : [];
    if (sub_categories.some((sc) => sc.name === params.name)) {
        return error.invalidData({
            param: "name",
            value: params.name,
            location: "body",
            message: `The sub-category name ${params.name} already exists`,
        });
    }

    const sub_category = {
        id: v1(),
        name: params.name,
        description: params.description,
        is_deleted: false,
    };

    sub_categories.push(sub_category);
    service.updated_time = new Date();
    await service.save();

    const objCategory = category;
    // if ("toJSON" in category && typeof category.toJSON === "function") {
    //     objCategory = category.toJSON();
    // }
    const tmpSubCategory = objCategory.sub_categories
        .filter((sc) => sc.is_deleted === false)
        .map((sc) => ({ ...sc, is_deleted: undefined }));
    const result = {
        ...objCategory,
        sub_categories: tmpSubCategory,
        service: service.id,
        tenant: service.tenant,
        type: service.type,
        is_deleted: undefined,
    };
    return success.created(result);
}

export async function getCategoryById(params: {
    categoryId: string;
    userId: string;
    userTenant?: string;
    userRoles: string[];
}): Promise<Result> {
    const pipeline: PipelineStage[] = [
        {
            $project: {
                _id: 0,
                technician: 1,
                categories: 1,
                service: {
                    id: "$id",
                    type: "$type",
                    name: "$name",
                },
                tenant: 1,
                is_deleted: 1,
            },
        },
        { $unwind: "$categories" },
        {
            $match: {
                "categories.is_deleted": false,
                is_deleted: false,
            },
        },
        {
            $replaceRoot: {
                newRoot: {
                    $mergeObjects: ["$$ROOT", "$categories"],
                },
            },
        },
        { $project: { categories: 0 } },
    ];
    const match: FilterQuery<ICategory> = {
        id: params.categoryId,
        is_deleted: false,
    };
    if (params.userTenant) {
        match.tenant = params.userTenant;
    }
    if (!params.userRoles.includes("SA") && !params.userRoles.includes("TA")) {
        match.technician = params.userId;
    }
    const project = {
        id: 1,
        name: 1,
        tenant: 1,
        service: 1,
        description: 1,
        technician: 1,
        sub_categories: {
            $filter: {
                input: "$sub_categories",
                as: "sub_category",
                cond: { $eq: ["$$sub_category.is_deleted", false] },
            },
        },
        created_time: 1,
        updated_time: 1,
    };
    pipeline.push(
        ...[
            { $match: match },
            { $project: project },
            {
                $project: {
                    is_deleted: 0,
                    sub_categories: {
                        is_deleted: 0,
                    },
                },
            },
        ]
    );
    const categories = await Service.aggregate(pipeline);

    if (categories.length > 0) {
        const category: ICategory = categories[0];
        const result: Omit<ICategory, "technician"> & {
            technician?: UserResBody;
        } = { ...category, technician: undefined };
        if (category.technician) {
            const response = await getUserById(category.technician);
            if (response.body?.is_active) {
                delete response.body?.activities;
                result.technician = response.body;
            }
        }
        return success.ok(result);
    } else {
        return error.notFound({
            location: "param",
            param: "categoryId",
            value: params.categoryId,
            message: `the category ${params.categoryId} does not exist`,
        });
    }
}

export async function updateCategory(params: {
    categoryId: string;
    name?: string;
    description?: string;
    technician?: string;
    userId: string;
    userTenant?: string;
    userRoles: string[];
}): Promise<Result> {
    const pipeline: PipelineStage[] = [
        {
            $project: {
                _id: 0,
                technician: 1,
                categories: 1,
                service: "$id",
                type: "$type",
                tenant: 1,
                is_deleted: 1,
            },
        },
        { $unwind: "$categories" },
        {
            $match: {
                "categories.is_deleted": false,
                is_deleted: false,
            },
        },
        {
            $replaceRoot: {
                newRoot: {
                    $mergeObjects: ["$$ROOT", "$categories"],
                },
            },
        },
        { $project: { categories: 0 } },
    ];
    const match: FilterQuery<ICategory> = {
        id: params.categoryId,
        is_deleted: false,
    };
    if (params.userTenant) {
        match.tenant = params.userTenant;
    }
    if (!params.userRoles.includes("SA") && !params.userRoles.includes("TA")) {
        match.technician = params.userId;
    }
    const project = {
        id: 1,
        name: 1,
        type: 1,
        tenant: 1,
        service: 1,
        description: 1,
        technician: 1,
        sub_categories: {
            $filter: {
                input: "$sub_categories",
                as: "sub_category",
                cond: { $eq: ["$$sub_category.is_deleted", false] },
            },
        },
        created_time: 1,
        updated_time: 1,
    };
    pipeline.push(
        ...[
            { $match: match },
            { $project: project },
            {
                $project: {
                    is_deleted: 0,
                    sub_categories: {
                        is_deleted: 0,
                    },
                },
            },
        ]
    );
    const categories = await Service.aggregate(pipeline);
    if (categories.length > 0) {
        const update: FilterQuery<ICategory> = {
            id: params.categoryId,
            is_deleted: false,
        };

        if (params.technician) {
            const response = await getUserById(params.technician);

            if (!response.body || response.status !== HttpStatus.OK) {
                return error.invalidData({
                    location: "body",
                    param: "technician",
                    value: params.technician,
                    message: `the technician id does not exist`,
                });
            }
        }
        const set: UpdateQuery<ICategory> = {
            name: params.name,
            description: params.description,
            technician: params.technician,
            updated_time: new Date(),
        };
        const result = await Service.findOneAndUpdate(
            {
                categories: {
                    $elemMatch: update,
                },
                is_deleted: false,
            },
            {
                $set: {
                    "categories.$.name": set.name,
                    "categories.$.description": set.description,
                    "categories.$.technician": params.technician,
                },
            },
            { new: true }
        );
        if (result) {
            const response = await getCategoryById({
                categoryId: params.categoryId,
                userTenant: params.userTenant,
                userRoles: params.userRoles,
                userId: params.userId,
            });
            return success.ok(response);
        } else {
            return error.notFound({
                location: "param",
                param: "categoryId",
                value: params.categoryId,
                message: `the category ${params.categoryId} does not exist`,
            });
        }
    } else {
        return error.notFound({
            location: "param",
            param: "categoryId",
            value: params.categoryId,
            message: `the category ${params.categoryId} does not exist`,
        });
    }
}

export async function deleteCategory(params: {
    categoryId: string;
    userTenant?: string;
}): Promise<Result> {
    const filter: FilterQuery<IServiceModel> = {
        categories: {
            $elemMatch: {
                id: params.categoryId,
                is_deleted: false,
            },
        },
        is_deleted: false,
    };
    const update = {
        $set: {
            "categories.$.is_deleted": true,
        },
    };
    if (params.userTenant) {
        filter.tenant = params.userTenant;
    }
    const result = await Service.updateOne(filter, update);
    if (result.matchedCount === 1) {
        return success.ok({ message: "success" });
    } else {
        return error.notFound({
            location: "params",
            param: "categoryId",
            value: params.categoryId,
            message: `the category ${params.categoryId} does not exist`,
        });
    }
}

export async function updateSubCategory(params: {
    subCategoryId: string;
    name?: string;
    description?: string;
    userTenant?: string;
}): Promise<Result> {
    const filter: FilterQuery<IServiceModel> = {
        categories: {
            $elemMatch: {
                sub_categories: {
                    $elemMatch: {
                        id: params.subCategoryId,
                        is_deleted: false,
                    },
                },
                is_deleted: false,
            },
        },
        is_deleted: false,
    };
    if (params.userTenant) {
        filter.tenant = params.userTenant;
    }
    const update = {
        $set: {
            "categories.$.sub_categories.$[xxx].name": params.name,
            "categories.$.sub_categories.$[xxx].description":
                params.description,
        },
    };
    const options = {
        arrayFilters: [{ "xxx.id": params.subCategoryId }],
        new: true,
    };
    const result = await Service.findOneAndUpdate(filter, update, options);
    if (result) {
        /* Finding the category that has the subCategoryId that matches the params.subCategoryId. */
        const category = result.categories.find((category) => {
            return category.sub_categories.find((subCategory) => {
                return subCategory.id === params.subCategoryId;
            });
        });
        const subCategory = category?.sub_categories.find((subCategory) => {
            return subCategory.id === params.subCategoryId;
        });
        if (subCategory) {
            return success.ok(subCategory);
        } else {
            return error.notFound({
                location: "params",
                param: "subCategoryId",
                value: params.subCategoryId,
                message: `the sub-category ${params.subCategoryId} does not exist`,
            });
        }
    } else {
        return error.notFound({
            location: "params",
            param: "subCategoryId",
            value: params.subCategoryId,
            message: `the sub-category ${params.subCategoryId} does not exist`,
        });
    }
}

export async function deleteSubCategory(params: {
    subCategoryId: string;
    userTenant?: string;
}): Promise<Result> {
    const filter: FilterQuery<IServiceModel> = {
        categories: {
            $elemMatch: {
                sub_categories: {
                    $elemMatch: {
                        id: params.subCategoryId,
                        is_deleted: false,
                    },
                },
                is_deleted: false,
            },
        },
        is_deleted: false,
    };
    if (params.userTenant) {
        filter.tenant = params.userTenant;
    }
    const update = {
        $set: {
            "categories.$.sub_categories.$[xxx].is_deleted": true,
        },
    };
    const options = {
        arrayFilters: [{ "xxx.id": params.subCategoryId }],
    };
    const result = await Service.updateOne(filter, update, options);
    if (result.matchedCount === 1) {
        return success.ok({ message: "success" });
    } else {
        return error.notFound({
            location: "params",
            param: "subCategoryId",
            value: params.subCategoryId,
            message: `the sub-category ${params.subCategoryId} does not exist`,
        });
    }
}

export async function getAllCategory(params: {
    serviceId?: string;
    tenant?: string;
}): Promise<Result> {
    const match: FilterQuery<IServiceModel> = {
        is_deleted: false,
        is_active: true,
    };
    params.tenant && (match.tenant = params.tenant);
    params.serviceId && (match.id = params.serviceId);
    const replace = { newRoot: "$categories" };
    const project = {
        categories: {
            $filter: {
                input: "$categories",
                as: "categories",
                cond: { $eq: ["$$categories.is_deleted", false] },
            },
        },
    };
    const unset = ["is_deleted", "sub_categories"];
    const pipeline: PipelineStage[] = [
        { $match: match },
        { $project: project },
        { $unwind: "$categories" },
        { $replaceRoot: replace },
        { $unset: unset },
    ];
    const categories = await Service.aggregate(pipeline);
    return success.ok(categories);
}

export async function getAllSubCategory(params: {
    categoryId?: string;
    tenant?: string;
}): Promise<Result> {
    const category = params.categoryId;
    const match: FilterQuery<IServiceModel> = {
        is_deleted: false,
        is_active: true,
    };
    category && (match["categories.id"] = category);
    params.tenant && (match.tenant = params.tenant);
    type Project = PipelineStage.Project["$project"];
    const project = (field: string): Project => ({
        [field]: {
            $filter: {
                input: `$${field}`,
                as: field,
                cond: { $eq: [`$$${field}.is_deleted`, false] },
            },
        },
    });

    const pipeline: PipelineStage[] = [
        { $match: match },
        { $project: project("categories") },
        { $unwind: "$categories" },
        { $replaceRoot: { newRoot: "$categories" } },
        { $project: project("sub_categories") },
        { $unwind: "$sub_categories" },
        { $replaceRoot: { newRoot: "$sub_categories" } },
    ];
    const result = await Service.aggregate(pipeline);
    return success.ok(result);
}
