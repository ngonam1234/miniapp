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
import { IRole, RoleType } from "../interfaces/models";
import Role from "../models/role";
import {
    CreateRoleCustomerReqBody,
    CreateRoleEmployeeReqBody,
    UpdateRoleCustomerReqBody,
    UpdateRoleEmployeeReqBody,
} from "../interfaces/request";
import { v1 } from "uuid";
import { UserResBody } from "../interfaces/response";
import { getTenantByCode, getTotalUserHaveRole, getUserById } from "../service";

async function checkTenantExist(tenant: string): Promise<void> {
    const response = await getTenantByCode(tenant);
    if (
        response.status === HttpStatus.NOT_FOUND ||
        response.body?.is_active === false
    ) {
        throw new HttpError(
            error.invalidData({
                param: "tenant",
                value: tenant,
                message: `the tenant ${tenant} does not exist`,
                description: {
                    en: `the tenant ${tenant} does not exist`,
                    vi: `tenant ${tenant} không tồn tại`,
                },
            })
        );
    }
}

async function checkRoleExist(params: {
    name: string;
    roleId?: string;
    tenant?: string;
}): Promise<void> {
    const match: FilterQuery<IRole> = {
        name: {
            $regex: `^${params.name}$`,
            $options: "i",
        },
        is_deleted: false,
    };
    params.tenant ? (match.tenant = params.tenant) : null;
    const role = await Role.findOne(match);
    if (role) {
        if (params.roleId === role.id) {
            return;
        }
        throw new HttpError({
            status: HttpStatus.BAD_REQUEST,
            code: "INVALID_DATA",
            description: {
                en: `Role with name ${params.name} already exists`,
                vi: `Phân quyền với tên ${params.name} đã tồn tại`,
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

export async function findRole(params: {
    query?: string;
    sort?: string;
    size: number;
    page: number;
    tenant?: string;
}): Promise<Result> {
    let filter: FilterQuery<IRole> = { is_deleted: false };
    let sort: Record<string, 1 | -1> = { created_time: -1 };
    params.tenant && (filter.tenant = params.tenant);
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
    const pipeline: PipelineStage[] = [
        { $match: filter },
        { $sort: sort },
        { $project: { _id: 0 } },
        { $facet: facet },
    ];
    const result = await Role.aggregate(pipeline)
        .collation({ locale: "vi" })
        .then((res) => res[0])
        .then(async (res) => {
            const total = !(res.meta.length > 0) ? 0 : res.meta[0].total;
            let totalPage = Math.ceil(total / params.size);
            totalPage = totalPage > 0 ? totalPage : 1;
            await Promise.all(
                res.data.map(
                    async (role: { name: string; total_user: number }) => {
                        const response = await getTotalUserHaveRole(
                            role.name,
                            params.tenant
                        );
                        role.total_user = response.body?.total_user || 0;
                    }
                )
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

export async function getRoleForUser(params: {
    tenant?: string;
}): Promise<Result> {
    const match: FilterQuery<IRole> = {
        is_active: true,
        is_deleted: false,
    };
    if (params.tenant) {
        match.$or = [{ type: RoleType.DEFAULT }];
        match.$or.push({ tenant: params.tenant });
    }
    const project = {
        label: "$name",
        value: "$id",
        _id: 0,
    };
    const result = await Role.aggregate([
        { $match: match },
        { $project: project },
    ]);
    return success.ok(result);
}

export async function getRoleById(params: {
    roleId: string;
    userRoles: string[];
    userTenant?: string;
}): Promise<Result> {
    const match: FilterQuery<IRole> = {
        id: params.roleId,
        is_deleted: false,
    };
    if (!params.userRoles.includes("SA")) {
        match.$or = [{ tenant: params.userTenant }, { type: RoleType.DEFAULT }];
    }
    const result = await Role.findOne(match, { _id: 0 });
    if (!result) {
        throw new HttpError(
            error.invalidData({
                location: "query",
                param: "roleId",
                message: `Role with id ${params.roleId} not found`,
                value: params.roleId,
                description: {
                    en: `Role with id ${params.roleId} not found`,
                    vi: `Không tìm thấy phân quyền với id ${params.roleId}`,
                },
            })
        );
    }
    const response = await getTotalUserHaveRole(result.name, params.userTenant);
    if (response.status === HttpStatus.OK) {
        result.total_user = response.body?.total_user || 0;
    }
    return success.ok(result);
}

export async function createRoleEmployee(
    params: CreateRoleEmployeeReqBody & {
        userRoles: string[];
        userId: string;
        userTenant: string;
    }
): Promise<Result> {
    await Promise.all([
        checkTenantExist(params.userTenant),
        checkRoleExist({
            name: params.name,
            tenant: params.userTenant,
        }),
    ]);

    let user: UserResBody | undefined;
    const response = await getUserById(params.userId);
    if (response.body?.is_active) {
        delete response.body?.activities;
        user = response.body;
    }

    const role = new Role({
        id: v1(),
        name: params.name,
        type: RoleType.EMPLOYEE,
        description: params.description,
        tenant: params.userTenant,
        is_active: params.is_active,
        is_deleted: false,
        created_time: new Date(),
        created_by: user,
        request_permission: params.request_permission,
        incident_permission: params.incident_permission,
        solution_permission: params.solution_permission,
        advanced_view_permission: params.advanced_view_permission,
        task_permission: params.task_permission,
    });
    const data = {
        ...role.toJSON(),
        _id: undefined,
    };
    await role.save();
    return success.created(data);
}

export async function createRoleCustomer(
    params: CreateRoleCustomerReqBody & {
        userRoles: string[];
        userId: string;
        userTenant: string;
    }
): Promise<Result> {
    await Promise.all([
        checkTenantExist(params.userTenant),
        checkRoleExist({
            name: params.name,
            tenant: params.userTenant,
        }),
    ]);

    let user: UserResBody | undefined;
    const response = await getUserById(params.userId);
    if (response.body?.is_active) {
        delete response.body?.activities;
        user = response.body;
    }

    const role = new Role({
        id: v1(),
        name: params.name,
        type: RoleType.CUSTOMER,
        description: params.description,
        tenant: params.userTenant,
        is_active: params.is_active,
        is_deleted: false,
        created_time: new Date(),
        created_by: user,
        request_permission: params.request_permission,
        incident_permission: params.incident_permission,
        solution_permission: params.solution_permission,
    });
    const data = {
        ...role.toJSON(),
        _id: undefined,
    };
    await role.save();
    return success.created(data);
}

export async function updateRoleEmployee(
    params: UpdateRoleEmployeeReqBody & {
        roleId: string;
        userRoles: string[];
        userId: string;
        userTenant?: string;
    }
): Promise<Result> {
    const match: FilterQuery<IRole> = {
        id: params.roleId,
        type: RoleType.EMPLOYEE, // only update employee role
        is_deleted: false,
    };
    params.userTenant ? (match["tenant"] = params.userTenant) : null;

    const role = await Role.findOne({
        id: params.roleId,
        is_deleted: false,
    });
    if (role) {
        await checkRoleExist({
            name: params.name,
            roleId: params.roleId,
            tenant: role.tenant,
        });
    }
    const errorMsg = error.invalidData({
        location: "query",
        param: "roleId",
        message: `Role with id ${params.roleId} not found`,
        value: params.roleId,
        description: {
            en: `Role with id ${params.roleId} not found`,
            vi: `Không tìm thấy phân quyền với id ${params.roleId}`,
        },
    });
    if (!match) {
        throw new HttpError(errorMsg);
    } else {
        let user: UserResBody | undefined;
        const response = await getUserById(params.userId);
        if (response.body?.is_active) {
            delete response.body?.activities;
            user = response.body;
        }
        const role = await Role.findOneAndUpdate(
            match,
            {
                $set: {
                    name: params.name,
                    description: params.description,
                    is_active: params.is_active,
                    updated_time: new Date(),
                    updated_by: user,
                    request_permission: params.request_permission,
                    incident_permission: params.incident_permission,
                    solution_permission: params.solution_permission,
                    advanced_view_permission: params.advanced_view_permission,
                    task_permission: params.task_permission,
                },
            },
            { new: true }
        );
        if (!role) {
            throw new HttpError(errorMsg);
        }
        const data = {
            ...role.toJSON(),
            _id: undefined,
        };
        return success.ok(data);
    }
}

export async function updateRoleCustomer(
    params: UpdateRoleCustomerReqBody & {
        roleId: string;
        userRoles: string[];
        userId: string;
        userTenant?: string;
    }
): Promise<Result> {
    const match: FilterQuery<IRole> = {
        id: params.roleId,
        type: RoleType.CUSTOMER, // only update customer role
        is_deleted: false,
    };
    params.userTenant ? (match["tenant"] = params.userTenant) : null;

    const role = await Role.findOne({
        id: params.roleId,
        is_deleted: false,
    });
    if (role) {
        await checkRoleExist({
            name: params.name,
            roleId: params.roleId,
            tenant: role.tenant,
        });
    }
    const errorMsg = error.invalidData({
        location: "query",
        param: "roleId",
        message: `Role with id ${params.roleId} not found`,
        value: params.roleId,
        description: {
            en: `Role with id ${params.roleId} not found`,
            vi: `Không tìm thấy phân quyền với id ${params.roleId}`,
        },
    });
    if (!match) {
        throw new HttpError(errorMsg);
    } else {
        let user: UserResBody | undefined;
        const response = await getUserById(params.userId);
        if (response.body?.is_active) {
            delete response.body?.activities;
            user = response.body;
        }
        const role = await Role.findOneAndUpdate(
            match,
            {
                $set: {
                    name: params.name,
                    description: params.description,
                    is_active: params.is_active,
                    updated_time: new Date(),
                    updated_by: user,
                    request_permission: params.request_permission,
                    incident_permission: params.incident_permission,
                    solution_permission: params.solution_permission,
                },
            },
            { new: true }
        );
        if (!role) {
            throw new HttpError(errorMsg);
        }
        const data = {
            ...role.toJSON(),
            _id: undefined,
        };
        return success.ok(data);
    }
}

export async function deleteRole(params: {
    roleId: string;
    userRoles: string[];
    userId: string;
    userTenant?: string;
}): Promise<Result> {
    const match: FilterQuery<IRole> = {
        id: params.roleId,
        type: { $ne: RoleType.DEFAULT },
        is_deleted: false,
    };
    params.userTenant ? (match["tenant"] = params.userTenant) : null;
    const errorMsg = error.invalidData({
        location: "query",
        param: "roleId",
        message: `Role with id ${params.roleId} not found`,
        value: params.roleId,
        description: {
            en: `Role with id ${params.roleId} not found`,
            vi: `Không tìm thấy phân quyền với id ${params.roleId}`,
        },
    });
    if (!match) {
        throw new HttpError(errorMsg);
    } else {
        const role = await Role.findOneAndUpdate(
            match,
            {
                $set: {
                    is_active: false,
                    is_deleted: true,
                },
            },
            { new: true }
        );
        if (!role) {
            throw new HttpError(errorMsg);
        }
        return success.ok({ message: "Delete role successfully" });
    }
}

export async function deleteManyRoles(params: {
    roleIds: string[];
    userRoles: string[];
    userId: string;
    userTenant?: string;
}): Promise<Result> {
    const match: FilterQuery<IRole> = {
        id: { $in: params.roleIds },
        type: { $ne: RoleType.DEFAULT },
        is_deleted: false,
    };
    params.userTenant ? (match["tenant"] = params.userTenant) : null;
    const errorMsg = error.invalidData({
        location: "query",
        param: "roleIds",
        message: "Role not found",
        value: params.roleIds,
        description: {
            en: "Role not found",
            vi: "Không tìm thấy phân quyền",
        },
    });
    const roles = await Role.updateMany(
        match,
        {
            $set: {
                is_active: false,
                is_deleted: true,
            },
        },
        { new: true }
    );
    if (roles.matchedCount === 0) {
        throw new HttpError(errorMsg);
    }
    return success.ok({ message: "Delete roles successfully" });
}

export async function getRoleNotCustomer(params: {
    userTenant?: string;
}): Promise<Result> {
    const match: FilterQuery<IRole> = {
        id: { $ne: "EU" },
        type: { $ne: RoleType.CUSTOMER },
        is_active: true,
        is_deleted: false,
    };
    if (params.userTenant) {
        match.$or = [{ tenant: params.userTenant }, { type: RoleType.DEFAULT }];
    }
    const roles = await Role.find(match, { _id: 0, id: 1 });
    const roleIds = roles.map((role: { id: string }) => role.id);
    return success.ok(roleIds);
}

export async function findRoleByIds(params: {
    roleIds: string[];
    userTenant?: string;
}): Promise<Result> {
    const match: FilterQuery<IRole> = {
        id: { $in: params.roleIds },
        is_active: true,
        is_deleted: false,
    };

    if (params.userTenant) {
        match.$or = [{ tenant: params.userTenant }, { type: RoleType.DEFAULT }];
    }
    const result = await Role.find(match, { _id: 0 });
    if (result.length === 0) {
        throw new HttpError(
            error.invalidData({
                location: "query",
                param: "roleIds",
                message: "Role not found",
                value: params.roleIds,
                description: {
                    en: "Role not found",
                    vi: "Không tìm thấy phân quyền",
                },
            })
        );
    }
    return success.ok(result);
}

export async function findRolesHaveApprovalPermission(params: {
    userTenant?: string;
}): Promise<ResultSuccess> {
    const match: FilterQuery<IRole> = {
        "task_permission.approve": {
            $eq: true,
        },
        is_active: true,
        is_deleted: false,
    };
    if (params.userTenant) {
        match.$or = [{ tenant: params.userTenant }, { type: RoleType.DEFAULT }];
    }
    const result = await Role.find(match, { _id: 0 });
    return success.ok(result);
}

export async function findRoleType(params: {
    roleIds: string[];
    userTenant?: string;
}): Promise<Result> {
    const match: FilterQuery<IRole> = {
        id: { $in: params.roleIds },
        is_active: true,
        is_deleted: false,
    };
    if (params.userTenant) {
        match.$or = [{ tenant: params.userTenant }, { type: RoleType.DEFAULT }];
    }
    const result = await Role.find(match, { _id: 0 });
    if (result.length === 0) {
        throw new HttpError(
            error.invalidData({
                location: "query",
                param: "roleIds",
                message: "Role not found",
                value: params.roleIds,
                description: {
                    en: "Role not found",
                    vi: "Không tìm thấy phân quyền",
                },
            })
        );
    }
    let typeRole = "";
    const ids = result.map((role: IRole) => role.id);
    const types = result.map((role: IRole) => role.type);

    if (ids.includes("EU") || types.includes(RoleType.CUSTOMER)) {
        typeRole = RoleType.CUSTOMER;
    }
    if (
        (types.includes(RoleType.DEFAULT) &&
            (ids.includes("L1") || ids.includes("L2"))) ||
        types.includes(RoleType.EMPLOYEE)
    ) {
        typeRole = RoleType.EMPLOYEE;
    }
    if (ids.includes("TA")) {
        typeRole = "TA";
    }
    if (ids.includes("SA")) {
        typeRole = "SA";
    }
    return success.ok({ typeRole });
}
