import { error, HttpError, HttpStatus, Result, success } from "app";
import { FilterQuery, PipelineStage } from "mongoose";
import { parseQuery, parseSort, ParseSyntaxError } from "mquery";
import { v1 } from "uuid";
import { IService } from "../interfaces/models";
import { SubServiceL2, UserResBody } from "../interfaces/response";
import { IServiceModel, Service } from "../models";
import Tenant from "../models/tenant";
import { getUserById } from "../services";
import { isNullOrUndefined } from "utils";
import { FindServiceReqQuery } from "../interfaces/request";

export async function createService(params: {
    name: string;
    type: string;
    description?: string;
    time_process?: number;
    time_support?: string;
    manager?: string;
    department?: string;
    is_active: boolean;
    tenant: string;
    userRoles?: string[];
}): Promise<Result> {
    await Promise.all([
        checkTenantExist(params.tenant),
        checkServiceExists({ name: params.name, tenant: params.tenant }),
    ]);

    const service = new Service({
        id: v1(),
        name: params.name,
        type: params.type,
        description: params.description,
        time_process: params.time_process,
        time_support: params.time_support,
        manager: params.manager,
        department: params.department,
        tenant: params.tenant,
        is_active: params.is_active,
        created_time: new Date(),
    });

    const data: Omit<IService, "manager" | "_id" | "is_deleted"> & {
        manager?: UserResBody;
        _id?: string;
        is_deleted?: boolean;
    } = {
        ...service.toJSON(),
        manager: undefined,
        _id: undefined,
        is_deleted: undefined,
    };
    if (params.manager) {
        const response = await getUserById(params.manager);
        if (!response.body || response.status !== HttpStatus.OK) {
            return error.invalidData({
                location: "body",
                param: "manager",
                value: params.manager,
                message: `the manager id does not exist`,
            });
        }
        if (response.body.tenant !== params.tenant) {
            return error.invalidData({
                location: "body",
                param: "manager",
                value: params.manager,
                message: `the manager do not belong tenant ${params.tenant}`,
            });
        }
        if (response.body.is_active) {
            delete response.body?.activities;
            data.manager = response.body;
        } else {
            return error.invalidData({
                location: "body",
                param: "manager",
                value: params.manager,
                message: `the manager is inactive`,
            });
        }
    }

    await service.save();
    return success.created(data);
}

export async function findService(
    params: FindServiceReqQuery & {
        userRoles: string[];
        userId: string;
    }
): Promise<Result> {
    let match: FilterQuery<IServiceModel> = { is_deleted: false };
    let sort: Record<string, 1 | -1> = { created_time: -1 };
    params.tenant && (match.tenant = params.tenant);
    try {
        if (params.query) {
            const uFilter = parseQuery(params.query);
            match = { $and: [match, uFilter] };
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

    const project = {
        _id: 0,
        id: 1,
        name: 1,
        type: 1,
        tenant: 1,
        description: 1,
        time_process: 1,
        time_support: 1,
        manager: 1,
        is_active: 1,
        created_time: 1,
        updated_time: 1,
        sub_services: {
            $filter: {
                input: "$sub_services",
                as: "sub_service",
                cond: { $eq: ["$$sub_service.is_deleted", false] },
            },
        },
    };
    const facetData: PipelineStage.FacetPipelineStage[] =
        params.size == -1
            ? []
            : [
                  { $skip: params.size * params.page },
                  { $limit: params.size * 1 },
              ];
    facetData.push({
        $project: {
            sub_services: {
                is_deleted: 0,
            },
        },
    });
    const facet = {
        meta: [{ $count: "total" }],
        data: facetData,
    };

    const pipeline: PipelineStage[] = [
        { $match: match },
        { $sort: sort },
        { $project: project },
        { $facet: facet },
    ];
    const result = await Service.aggregate(pipeline)
        .collation({ locale: "vi" })
        .then((res) => res[0])
        .then((res) => {
            const total = !(res.meta.length > 0) ? 0 : res.meta[0].total;
            let totalPage = Math.ceil(total / params.size);
            totalPage = totalPage > 0 ? totalPage : 1;
            res.data = res.data.map(
                (service: {
                    sub_services: { sub_services_L2: SubServiceL2[] }[];
                }) => {
                    service.sub_services = service.sub_services.map(
                        (sub_service: { sub_services_L2: SubServiceL2[] }) => {
                            sub_service.sub_services_L2 =
                                sub_service.sub_services_L2?.filter(
                                    (subl2: { is_deleted: boolean }) =>
                                        subl2.is_deleted === false
                                );
                            return sub_service;
                        }
                    );
                    return service;
                }
            );
            return {
                page: Number(params.page),
                total: total,
                total_page: totalPage,
                data: res.data,
            };
        });
    return success.ok(result);
}

/**
 * It updates a service with the given id
 * @param params - {
 * @returns A promise that resolves to a Result object.
 */
export async function updateService(params: {
    serviceId: string;
    name: string;
    type?: string;
    description?: string;
    time_process?: number;
    time_support?: string;
    manager?: string;
    department?: string;
    is_active: boolean;
    userId: string;
    userTenant?: string;
    userRoles: string[];
}): Promise<Result> {
    const match: FilterQuery<IServiceModel> = {
        id: params.serviceId,
        is_deleted: false,
    };
    if (params.userTenant) {
        match.tenant = params.userTenant;
    }
    if (!match) {
        return error.notFound({
            location: "body",
            param: "serviceId",
            value: params.serviceId,
            message: `The service ${params.serviceId} does not exist`,
        });
    } else {
        const service = await Service.findOne(match);
        if (service) {
            await checkServiceExists({
                name: params.name,
                serviceId: params.serviceId,
                tenant: params.userTenant,
            });
        }
        await Service.findOneAndUpdate(
            { id: params.serviceId },
            {
                $set: {
                    name: params.name,
                    type: params.type,
                    description: params.description,
                    time_process: params.time_process,
                    time_support: params.time_support,
                    manager: params.manager,
                    department: params.department,
                    is_active: params.is_active,
                    updated_time: new Date(),
                },
            },
            {
                new: true,
                projection: { _id: 0, activities: 0 },
            }
        );

        const project = {
            id: 1,
            name: 1,
            type: 1,
            tenant: 1,
            description: 1,
            time_process: 1,
            time_support: 1,
            department: 1,
            manager: 1,
            sub_services: {
                $filter: {
                    input: "$sub_services",
                    as: "sub_service",
                    cond: { $eq: ["$$sub_service.is_deleted", false] },
                },
            },
            created_time: 1,
            updated_time: 1,
        };
        const pipeline: PipelineStage[] = [
            { $match: match },
            { $project: project },
            {
                $project: {
                    _id: 0,
                    categories: 0,
                    is_deleted: 0,
                    sub_services: {
                        is_deleted: 0,
                    },
                },
            },
        ];

        const services = await Service.aggregate(pipeline);

        if (services.length > 0) {
            const service: IService = services[0];
            const result: Omit<IService, "manager"> & {
                manager?: UserResBody;
            } = { ...service, manager: undefined };
            if (service.manager) {
                const response = await getUserById(service.manager);
                if (response.body?.is_active) {
                    delete response.body?.activities;
                    result.manager = response.body;
                }
            }
            return success.ok(result);
        } else {
            return error.notFound({
                location: "param",
                param: "serviceId",
                value: params.serviceId,
                message: `the service ${params.serviceId} does not exist`,
            });
        }
    }
}

export async function createSubService(params: {
    serviceId: string;
    name: string;
    userTenant?: string;
}): Promise<Result> {
    const match: FilterQuery<IServiceModel> = {
        id: params.serviceId,
        is_deleted: false,
    };
    if (params.userTenant) {
        match.tenant = params.userTenant;
    }
    const service = await Service.findOne(match);
    if (!service) {
        return error.notFound({
            param: "serviceId",
            value: params.serviceId,
            location: "params",
            message: `The service ${params.serviceId} does not exist`,
        });
    }
    const sub_services = service.sub_services;
    if (
        sub_services.some((su) => {
            return su.name === params.name && su.is_deleted === false;
        })
    ) {
        return error.invalidData({
            param: "name",
            value: params.name,
            location: "body",
            message: `The sub-service name ${params.name} already exists`,
            description: {
                en: `The sub-service name ${params.name} already exists`,
                vi: `Tên dịch vụ cấp 2 ${params.name} đã tồn tại`,
            },
        });
    }

    const sub_service = {
        id: v1(),
        name: params.name,
        sub_services_L2: [],
        is_deleted: false,
    };

    service.sub_services.push(sub_service);
    service.updated_time = new Date();
    await service.save();
    const result = {
        ...service.toJSON(),
        _id: undefined,
    };
    return success.created(result);
}

export async function createManySubService(params: {
    serviceId: string;
    names: string[];
    userTenant?: string;
}): Promise<Result> {
    const match: FilterQuery<IServiceModel> = {
        id: params.serviceId,
        is_deleted: false,
    };
    if (params.userTenant) {
        match.tenant = params.userTenant;
    }
    const service = await Service.findOne(match);
    if (!service) {
        return error.notFound({
            param: "serviceId",
            value: params.serviceId,
            location: "params",
            message: `the service ${params.serviceId} does not exist`,
        });
    }
    if (service.is_active === false) {
        return error.notFound({
            param: "serviceId",
            value: params.serviceId,
            location: "params",
            message: `the service ${params.serviceId} is inactive`,
        });
    }
    const sub_services = service.sub_services;
    const names = params.names;
    const existedNames = sub_services.map((su) => {
        if (!su.is_deleted) {
            return undefined;
        }
        return su.name;
    });
    const duplicatedNames = names.filter((name) => existedNames.includes(name));
    if (duplicatedNames.length > 0) {
        return error.invalidData({
            param: "name",
            value: duplicatedNames,
            location: "body",
            message: `The sub-service name ${duplicatedNames} already exists`,
        });
    }
    const newSubServices = names.map((name) => ({
        id: v1(),
        name: name,
        sub_services_L2: [],
        is_deleted: false,
    }));
    service.sub_services.push(...newSubServices);
    service.updated_time = new Date();
    await service.save();
    const result = {
        ...service.toJSON(),
        _id: undefined,
    };
    return success.created(result);
}

export async function getServiceById(params: {
    serviceId: string;
    userId: string;
    userTenant?: string;
    userRoles: string[];
}): Promise<Result> {
    const match: FilterQuery<IServiceModel> = {
        id: params.serviceId,
        is_deleted: false,
    };
    if (params.userTenant) {
        match.tenant = params.userTenant;
    }
    // if (!params.userRoles.includes("SA") && params.userRoles.includes("TA")) {
    //     match.manager = params.userId;
    // }
    const project = {
        id: 1,
        name: 1,
        type: 1,
        tenant: 1,
        description: 1,
        time_process: 1,
        time_support: 1,
        department: 1,
        manager: 1,
        is_active: 1,
        sub_services: {
            $filter: {
                input: "$sub_services",
                as: "sub_service",
                cond: { $eq: ["$$sub_service.is_deleted", false] },
            },
        },
        created_time: 1,
        updated_time: 1,
    };
    const pipeline: PipelineStage[] = [
        { $match: match },
        { $project: project },
        {
            $project: {
                _id: 0,
                categories: 0,
                is_deleted: 0,
                sub_services: {
                    is_deleted: 0,
                },
            },
        },
    ];
    const services = await Service.aggregate(pipeline);

    if (services.length > 0) {
        const service: IService = services[0];
        const result: Omit<IService, "manager"> & {
            manager?: UserResBody;
        } = { ...service, manager: undefined };
        if (service.manager) {
            const response = await getUserById(service.manager);
            if (response.body?.is_active) {
                delete response.body?.activities;
                result.manager = response.body;
            }
        }
        return success.ok(result);
    } else {
        return error.notFound({
            location: "param",
            param: "serviceId",
            value: params.serviceId,
            message: `the service ${params.serviceId} does not exist`,
        });
    }
}

export async function updateSubService(params: {
    subServiceId: string;
    name?: string;
    userId: string;
    userTenant?: string;
    userRoles: string[];
}): Promise<Result> {
    const filter: FilterQuery<IServiceModel> = {
        sub_services: {
            $elemMatch: {
                id: params.subServiceId,
                is_deleted: false,
            },
        },
        is_deleted: false,
    };
    const update = {
        $set: {
            "sub_services.$.name": params.name,
        },
    };
    if (params.userTenant) {
        filter.tenant = params.userTenant;
    }
    const service = await Service.findOne(filter);
    const serviceId = service?.id;
    if (!service) {
        return error.notFound({
            param: "serviceId",
            value: serviceId,
            location: "params",
            message: `The service ${serviceId} does not exist`,
        });
    }
    const sub_services = service.sub_services;
    if (
        sub_services.some((su) => {
            return (
                su.id !== params.subServiceId &&
                su.name === params.name &&
                su.is_deleted === false
            );
        })
    ) {
        return error.invalidData({
            param: "name",
            value: params.name,
            location: "body",
            message: `The sub-service name ${params.name} already exists`,
            description: {
                en: `The sub-service name ${params.name} already exists`,
                vi: `Tên dịch vụ cấp 2 ${params.name} đã tồn tại`,
            },
        });
    }
    const result = await Service.findOneAndUpdate(filter, update, {
        new: true,
    });
    if (result) {
        const sub_service = result.sub_services.filter(
            (su) => su.id === params.subServiceId
        )[0];
        return success.ok(sub_service);
    } else {
        return error.notFound({
            location: "params",
            param: "subServiceId",
            value: params.subServiceId,
            message: `The sub-service ${params.subServiceId} does not exist`,
        });
    }
}

export async function createSubServiceL2(params: {
    name: string;
    subServiceId: string;
    userId: string;
    userTenant?: string;
    userRoles: string[];
}): Promise<Result> {
    const filter: FilterQuery<IServiceModel> = {
        sub_services: {
            $elemMatch: {
                id: params.subServiceId,
                is_deleted: false,
            },
        },
        is_deleted: false,
    };

    const subService = (await Service.findOne(filter))?.sub_services.filter(
        (su) => su.id === params.subServiceId
    )[0];
    if (!subService) {
        return error.notFound({
            location: "params",
            param: "subServiceId",
            value: params.subServiceId,
            message: `The sub-service ${params.subServiceId} does not exist`,
        });
    }
    const sub_services_L2_old = subService.sub_services_L2;
    if (
        sub_services_L2_old.some(
            (su) => su.name === params.name && !su.is_deleted
        )
    ) {
        return error.invalidData({
            param: "name",
            value: params.name,
            location: "body",
            message: `The sub-service L2 name ${params.name} already exists`,
            description: {
                vi: `Tên dịch vụ cấp 3 ${params.name} đã tồn tại`,
                en: `The sub-service L2 name ${params.name} already exists`,
            },
        });
    }

    const update = {
        $push: {
            "sub_services.$.sub_services_L2": {
                id: v1(),
                name: params.name,
                is_deleted: false,
            },
        },
    };
    if (params.userTenant) {
        filter.tenant = params.userTenant;
    }
    const result = await Service.findOneAndUpdate(filter, update, {
        new: true,
    });
    if (!result) {
        return error.notFound({
            location: "params",
            param: "subServiceId",
            value: params.subServiceId,
            message: `the sub-service ${params.subServiceId} does not exist`,
        });
    }
    const sub_service = result.sub_services.filter(
        (su) => su.id === params.subServiceId
    )[0];
    const sub_services_L2 = sub_service.sub_services_L2.filter(
        (su) => su.name === params.name
    )[0];
    return success.created(sub_services_L2);
}

export async function createManySubServiceL2(params: {
    names: string[];
    subServiceId: string;
    userId: string;
    userTenant?: string;
    userRoles: string[];
}): Promise<Result> {
    const filter: FilterQuery<IServiceModel> = {
        sub_services: {
            $elemMatch: {
                id: params.subServiceId,
                is_deleted: false,
            },
        },
        is_deleted: false,
    };
    const update = {
        $push: {
            "sub_services.$.sub_services_L2": {
                $each: params.names.map((name) => ({
                    id: v1(),
                    name: name,
                    is_deleted: false,
                })),
            },
        },
    };
    if (params.userTenant) {
        filter.tenant = params.userTenant;
    }
    const result = await Service.findOneAndUpdate(filter, update, {
        new: true,
    });
    if (!result) {
        return error.notFound({
            location: "params",
            param: "subServiceId",
            value: params.subServiceId,
            message: `The sub-service ${params.subServiceId} does not exist`,
        });
    }
    const sub_service = result.sub_services.filter(
        (su) => su.id === params.subServiceId
    )[0];
    const sub_services_L2 = sub_service.sub_services_L2.filter((su) =>
        params.names.includes(su.name)
    );
    return success.created(sub_services_L2);
}

export async function updateSubServiceL2(params: {
    subServiceL2Id: string;
    name?: string;
    userId: string;
    userTenant?: string;
    userRoles: string[];
}): Promise<Result> {
    const filter: FilterQuery<IServiceModel> = {
        sub_services: {
            $elemMatch: {
                sub_services_L2: {
                    $elemMatch: {
                        id: params.subServiceL2Id,
                        is_deleted: false,
                    },
                },
                is_deleted: false,
            },
        },
        is_deleted: false,
    };

    const service = await Service.findOne(filter);
    const subService = service?.sub_services.filter(
        (su) =>
            su.sub_services_L2.some(
                (su2) => su2.id === params.subServiceL2Id && !su2.is_deleted
            ) && !su.is_deleted
    )[0];
    const subServiceId = subService?.id;
    if (!subService) {
        return error.notFound({
            location: "params",
            param: "subServiceId",
            value: subServiceId,
            message: `The sub-service ${subServiceId} does not exist`,
        });
    }
    const subServiceL2 = subService.sub_services_L2;
    if (
        subServiceL2.some(
            (su) =>
                su.id !== params.subServiceL2Id &&
                su.name === params.name &&
                !su.is_deleted
        )
    ) {
        return error.invalidData({
            param: "name",
            value: params.name,
            location: "body",
            message: `The sub-service L2 name ${params.name} already exists`,
            description: {
                vi: `Tên dịch vụ cấp 3 ${params.name} đã tồn tại`,
                en: `The sub-service L2 name ${params.name} already exists`,
            },
        });
    }

    const update = {
        $set: {
            "sub_services.$.sub_services_L2.$[xxx].name": params.name,
        },
    };
    const options = {
        new: true,
        arrayFilters: [
            {
                "xxx.id": params.subServiceL2Id,
            },
        ],
    };
    if (params.userTenant) {
        filter.tenant = params.userTenant;
    }
    const result = await Service.findOneAndUpdate(filter, update, options);
    if (result) {
        const subService = result.sub_services.find((subService) => {
            return subService.sub_services_L2.find((subServiceL2) => {
                return subServiceL2.id === params.subServiceL2Id;
            });
        });
        const subServiceL2 = subService?.sub_services_L2.find(
            (subServiceL2) => {
                return subServiceL2.id === params.subServiceL2Id;
            }
        );
        if (subServiceL2) {
            return success.ok(subServiceL2);
        } else {
            return error.notFound({
                location: "params",
                param: "subServiceL2Id",
                value: params.subServiceL2Id,
                message: `The sub-service L2 ${params.subServiceL2Id} does not exist`,
            });
        }
    } else {
        return error.notFound({
            location: "params",
            param: "subServiceL2Id",
            value: params.subServiceL2Id,
            message: `The sub-service L2 ${params.subServiceL2Id} does not exist`,
        });
    }
}

export async function deleteSubServiceL2(params: {
    subServiceL2Id: string;
    userId: string;
    userTenant?: string;
    userRoles: string[];
}): Promise<Result> {
    const filter: FilterQuery<IServiceModel> = {
        sub_services: {
            $elemMatch: {
                sub_services_L2: {
                    $elemMatch: {
                        id: params.subServiceL2Id,
                        is_deleted: false,
                    },
                },
                is_deleted: false,
            },
        },
        is_deleted: false,
    };
    const update = {
        $set: {
            "sub_services.$.sub_services_L2.$[xxx].is_deleted": true,
        },
    };
    const options = {
        new: true,
        arrayFilters: [
            {
                "xxx.id": params.subServiceL2Id,
            },
        ],
    };
    if (params.userTenant) {
        filter.tenant = params.userTenant;
    }
    const result = await Service.findOneAndUpdate(filter, update, options);
    if (result) {
        const subService = result.sub_services.find((subService) => {
            return subService.sub_services_L2.find((subServiceL2) => {
                return subServiceL2.id === params.subServiceL2Id;
            });
        });
        const subServiceL2 = subService?.sub_services_L2.find(
            (subServiceL2) => {
                return subServiceL2.id === params.subServiceL2Id;
            }
        );
        if (subServiceL2) {
            return success.ok({
                message: `the sub-service L2 ${params.subServiceL2Id} has been deleted`,
            });
        } else {
            return error.notFound({
                location: "params",
                param: "subServiceL2Id",
                value: params.subServiceL2Id,
                message: `The sub-service L2 ${params.subServiceL2Id} does not exist`,
            });
        }
    } else {
        return error.notFound({
            location: "params",
            param: "subServiceL2Id",
            value: params.subServiceL2Id,
            message: `The sub-service L2 ${params.subServiceL2Id} does not exist`,
        });
    }
}

async function checkTenantExist(tenantCode: string): Promise<void> {
    const tenant = await Tenant.findOne({ code: tenantCode });
    if (!tenant) {
        throw new HttpError(
            error.invalidData({
                value: tenantCode,
                param: "tenant",
                location: "query",
                message: `tenant with id: ${tenantCode} does not exists`,
            })
        );
    }
    if (tenant.is_active === false) {
        throw new HttpError(
            error.invalidData({
                value: tenantCode,
                param: "tenant",
                location: "query",
                message: `tenant with id: ${tenantCode} is inactive`,
            })
        );
    }
}
async function checkServiceExists(params: {
    name: string;
    serviceId?: string;
    tenant?: string;
}): Promise<void> {
    const match: FilterQuery<IService> = {
        name: {
            $regex: `^${params.name}$`,
            $options: "i",
        },
        is_deleted: false,
    };
    params.tenant ? (match.tenant = params.tenant) : null;
    const service = await Service.findOne(match);
    if (service) {
        if (params.serviceId === service.id) {
            return;
        }
        throw new HttpError({
            status: HttpStatus.BAD_REQUEST,
            code: "INVALID_DATA",
            description: {
                en: "Service already exists",
                vi: "Dịch vụ đã tồn tại",
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

export async function deleteService(params: {
    serviceId: string;
    userTenant?: string;
}): Promise<Result> {
    const filter: FilterQuery<IServiceModel> = {
        id: params.serviceId,
        is_deleted: false,
    };
    if (params.userTenant) {
        filter.tenant = params.userTenant;
    }
    const update = {
        $set: { is_deleted: true },
    };
    const result = await Service.updateOne(filter, update);

    if (result.matchedCount === 1) {
        return success.ok({ message: "success" });
    } else {
        return error.notFound({
            location: "param",
            param: "serviceId",
            value: params.serviceId,
            message: `the service ${params.serviceId} does not exist`,
        });
    }
}

export async function deleteSubService(params: {
    subServiceId: string;
    userTenant?: string;
}): Promise<Result> {
    const filter: FilterQuery<IServiceModel> = {
        sub_services: {
            $elemMatch: {
                id: params.subServiceId,
                is_deleted: false,
            },
        },
        is_deleted: false,
    };
    const update = {
        $set: {
            "sub_services.$.is_deleted": true,
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
            value: params.subServiceId,
            message: `the sub-service ${params.subServiceId} does not exist`,
        });
    }
}
export async function getAllService(params: {
    tenant?: string;
    is_active?: boolean;
}): Promise<Result> {
    const filter: FilterQuery<IServiceModel> = {
        is_deleted: false,
    };
    params.tenant && (filter.tenant = params.tenant);
    !isNullOrUndefined(params.is_active) &&
        (filter.is_active = params.is_active);
    const result = await Service.find(filter, {
        _id: 0,
        sub_services: 0,
        categories: 0,
    });
    return success.ok(result);
}

export async function getAllServiceSubService(params: {
    tenant?: string;
    serviceName?: string;
}): Promise<Result> {
    const filter: FilterQuery<IServiceModel> = {
        is_deleted: false,
    };
    if (params.tenant) {
        filter.tenant = params.tenant;
    }
    if (params.serviceName) {
        filter.$or = [
            {
                name: {
                    $regex: `^${params.serviceName}$`,
                    $options: "i",
                },
            },
            {
                $and: [
                    {
                        "sub_services.name": {
                            $regex: `^${params.serviceName}$`,
                            $options: "i",
                        },
                    },
                    { "sub_services.is_deleted": false },
                ],
            },
            {
                $and: [
                    {
                        "sub_services.sub_services_L2.name": {
                            $regex: `^${params.serviceName}$`,
                            $options: "i",
                        },
                    },
                    { "sub_services.sub_services_L2.is_deleted": false },
                ],
            },
        ];
    }
    const result = await Service.find(filter, {
        _id: 0,
        categories: 0,
    });
    return success.ok(result);
}

export async function getAllSubService(params: {
    serviceId?: string;
    tenant?: string;
}): Promise<Result> {
    const match: FilterQuery<IServiceModel> = {
        is_deleted: false,
        is_active: true,
    };
    params.tenant && (match.tenant = params.tenant);
    params.serviceId && (match.id = params.serviceId);
    const replace = { newRoot: "$sub_services" };
    const project = {
        sub_services: {
            $filter: {
                input: "$sub_services",
                as: "sub_services",
                cond: { $eq: ["$$sub_services.is_deleted", false] },
            },
        },
    };
    const pipeline: PipelineStage[] = [
        { $match: match },
        { $project: project },
        { $unwind: "$sub_services" },
        { $replaceRoot: replace },
    ];
    const subServices = await Service.aggregate(pipeline);
    return success.ok(subServices);
}

export async function getAllSubServiceL2BySubService(params: {
    subServiceId?: string;
    tenant?: string;
}): Promise<Result> {
    const subService = params.subServiceId;
    // const serviceId = params.serviceId;
    const matchFirst: FilterQuery<IServiceModel> = {
        is_deleted: false,
        is_active: true,
    };
    const match: FilterQuery<IServiceModel> = {};

    subService && (match["id"] = subService);
    params.tenant && (matchFirst.tenant = params.tenant);
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
        { $match: matchFirst },
        { $project: project("sub_services") },
        { $unwind: "$sub_services" },
        { $replaceRoot: { newRoot: "$sub_services" } },
        {
            $match: match,
        },
        { $project: project("sub_services_L2") },
        { $unwind: "$sub_services_L2" },
        { $replaceRoot: { newRoot: "$sub_services_L2" } },
    ];
    const result = await Service.aggregate(pipeline);
    return success.ok(result);
}

export async function getAllSubServiceL2ByService(params: {
    serviceId?: string;
    tenant?: string;
}): Promise<Result> {
    const service = params.serviceId;
    const match: FilterQuery<IServiceModel> = {
        is_deleted: false,
        is_active: true,
    };
    service && (match.id = service);
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
        { $project: project("sub_services") },
        { $unwind: "$sub_services" },
        { $replaceRoot: { newRoot: "$sub_services" } },
        { $project: project("sub_services_L2") },
        { $unwind: "$sub_services_L2" },
        { $replaceRoot: { newRoot: "$sub_services_L2" } },
    ];
    const result = await Service.aggregate(pipeline);
    return success.ok(result);
}
