/* eslint-disable @typescript-eslint/no-unused-vars */
import {
    HttpError,
    HttpStatus,
    Result,
    ResultSuccess,
    error,
    success,
} from "app";
import mongoose, { FilterQuery, PipelineStage } from "mongoose";
import { ParseSyntaxError, parseQuery, parseSort } from "mquery";
import { v1 } from "uuid";
import { IAccount, IUser, UserAction } from "../interfaces/models";
import {
    FindTotalUserReqQuery,
    FindUserReqBody,
    ImportUserReqBody,
} from "../interfaces/request";
import { Account, User } from "../models";
import {
    addMemberToDepartment,
    findDepartmentById,
    findRoleByIds,
    findRoleNotCustomer,
    findRolesHaveApprovalPermission,
    getDepartmentByIds,
    getDownloadLinks,
    getTenantByCode,
    getTenantByCodes,
    increaseUser,
    removeMemberFromDepartment,
} from "../services";
import {
    createAccount,
    getRoleById,
    updateAccountActivation,
} from "./account.controller";
import {
    checkGroupExistsById,
    checkUserNotCustomerPortal,
    getGroupByUser,
    getGroupByUserAndSort,
    membersOfGroup,
    removeMemberFromGroup,
} from "./group.controller";

export async function createUser(params: {
    email: string;
    fullname?: string;
    password: string;
    phone?: string;
    tenant?: string;
    roles: string[];
    department?: string;
    position?: string;
    is_active: boolean;
    userRoles: string[];
    userId: string;
}): Promise<Result> {
    if (!params.userRoles.includes("SA")) {
        if (params.roles?.includes("SA")) {
            return error.actionNotAllowed();
        }
    } else if (params.tenant) {
        await checkTenantByCode(params.tenant);
    }
    await checkEmailExists(params.email);

    if (params.tenant) {
        await increaseUser([{ tenant: params.tenant, amount: 1 }]);
    }

    if (params.roles.length > 1 && params.roles.includes("SA")) {
        return error.actionNotAllowed();
    }

    const user = new User({
        id: v1(),
        fullname: params.fullname,
        email: params.email,
        phone: params.phone,
        tenant: params.tenant,
        position: params.position,
        department: params.department,
        created_time: new Date(),
        is_active: params.is_active,
        activities: [
            {
                action: UserAction.CREATE,
                actor: params.userId,
                time: new Date(),
            },
        ],
    });

    await Promise.all([
        createAccount([
            {
                id: user.id,
                email: params.email,
                password: params.password,
                is_active: params.is_active,
                roles: params.roles,
                tenant: params.tenant,
            },
        ]),
        user.save(),
    ]);
    const data = {
        ...user.toJSON(),
        _id: undefined,
        is_active: undefined,
        activities: undefined,
    };
    if (params.tenant && params.department) {
        const response = await addMemberToDepartment({
            department: params.department,
            user: user.id,
        });
        if (response.status !== HttpStatus.OK) {
            throw error.service(response.path);
        }
    }
    return success.created(data);
}

export async function updateUser(params: {
    id: string;
    fullname?: string;
    phone?: string;
    roles?: string[];
    department?: string;
    position?: string;
    is_active?: boolean;
    userId: string;
    userRoles: string[];
}): Promise<Result> {
    if (!params.userRoles.includes("SA")) {
        if (params.roles?.includes("SA")) {
            return error.actionNotAllowed();
        }
    }

    if (
        params.roles &&
        params.roles?.length > 1 &&
        params.roles?.includes("SA")
    ) {
        return error.actionNotAllowed();
    }
    const session = await mongoose.startSession();
    session.startTransaction();
    const user = await User.findOneAndUpdate(
        { id: params.id },
        {
            $set: {
                fullname: params.fullname,
                phone: params.phone,
                position: params.position,
                is_active: params.is_active,
                updated_time: new Date(),
            },
            $push: {
                activities: {
                    action: UserAction.UPDATE,
                    actor: params.userId,
                    time: new Date(),
                },
            },
        },
        { session, new: true, projection: { activities: 0 } }
    );
    const account = await Account.findOneAndUpdate(
        { id: params.id },
        {
            $set: {
                roles: params.roles,
                is_active: params.is_active,
            },
        },
        { session, new: true }
    );
    if (user != null && account != null) {
        if (
            params.department != null &&
            user.department !== params.department
        ) {
            const oldDepartment = user.department;
            user.department = params.department || undefined;
            const [response] = await Promise.all([
                params.department
                    ? addMemberToDepartment({
                          user: params.id,
                          department: params.department,
                      })
                    : oldDepartment
                    ? removeMemberFromDepartment({
                          user: params.id,
                          department: oldDepartment,
                      })
                    : undefined,
                user.save({ session }),
            ]);
            if (response && response.status !== HttpStatus.OK) {
                await session.abortTransaction();
                session.endSession();
                return error.service(response.path);
            }
        }
        if (params.roles) {
            const [role_ids, roles] = await Promise.all([
                findRoleNotCustomer(user.tenant),
                findRoleByIds(params.roles, user.tenant),
            ]);
            if (roles.status !== HttpStatus.OK) {
                throw error.service(roles.path);
            }
            if (role_ids.status !== HttpStatus.OK) {
                throw error.service(role_ids.path);
            }
            if (role_ids.body && role_ids.body.length > 0) {
                const is_customer_portal = checkUserNotCustomerPortal({
                    userRoles: params.roles,
                    roles: role_ids.body,
                });
                if (is_customer_portal === false) {
                    const response = await removeMemberFromGroup(user.id);
                    if (response && response.status !== HttpStatus.OK) {
                        await session.abortTransaction();
                        session.endSession();
                        return error.invalidData({
                            location: "userId",
                            value: user.id,
                            message: "Can't remove user from group",
                        });
                    }
                }
            }
        }

        await session.commitTransaction();
        session.endSession();
        const data = {
            ...user.toJSON(),
            roles: account?.roles,
            _id: undefined,
        };
        return success.ok(data);
    } else {
        await session.abortTransaction();
        session.endSession();
        return error.notFound({
            location: "body",
            param: "id",
            value: params.id,
            message: "the user does not exist",
        });
    }
}

export async function findUser(params: {
    query?: string;
    sort?: string;
    size: number;
    page: number;
    tenant?: string;
    userRoles: string[];
    is_active?: boolean;
}): Promise<Result> {
    let filter: FilterQuery<IUser> = {};
    let sort: Record<string, 1 | -1> = { created_time: -1 };
    params.tenant && (filter.tenant = params.tenant);
    if (params.is_active != null) {
        filter.is_active = Boolean(params.is_active);
    }
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
        const uFilter = params.query && parseQuery(params.query);
        uFilter && (filter = { $and: [filter, uFilter] });
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
        { $project: { _id: 0, activities: 0 } },
        { $facet: facet },
    ];
    const result = await User.aggregate(pipeline)
        .collation({ locale: "vi" })
        .then((res) => res[0])
        .then(async (res) => {
            const total = !(res.meta.length > 0) ? 0 : res.meta[0].total;
            let totalPage = Math.ceil(total / params.size);
            totalPage = totalPage > 0 ? totalPage : 1;
            for (let i = 0; i < res.data.length; i++) {
                const e = res.data[i];
                const roles = await Account.findOne({ id: e.id });
                Object.assign(e, { roles: roles?.roles });
            }
            return {
                page: Number(params.page),
                total: total,
                total_page: totalPage,
                data: res.data,
            };
        });
    const ids: string[] = [];
    for (const data of result.data) {
        if (data.department) {
            ids.push(data.department);
        }
    }
    const response = await getDepartmentByIds(ids);

    result.data.forEach((e: IUser) => {
        const department = response.body?.find((i) => i.id == e.department);
        if (department) {
            Object.assign(e, {
                department: {
                    id: department?.id,
                    name: department?.name,
                },
            });
        }
    });
    return success.ok(result);
}

export async function findUserByRoleEU(params: {
    query?: string;
    sort?: string;
    size: number;
    page: number;
    userTenant?: string;
    userRoles: string[];
}): Promise<Result> {
    let filter: FilterQuery<IAccount> = { roles: { $in: ["EU"] } };
    let sort: undefined | Record<string, 1 | -1> = undefined;
    params.userTenant && (filter["tenant.code"] = params.userTenant);
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
        const userFilter = params.query && parseQuery(params.query);
        userFilter && (filter = { $and: [filter, userFilter] });
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

    const pipeline: PipelineStage[] = [{ $match: filter }];
    sort && pipeline.push({ $sort: sort });
    pipeline.push(
        { $project: { _id: 0, password: 0, failed_login: 0 } },
        { $facet: facet }
    );
    const result = await Account.aggregate(pipeline)
        .collation({ locale: "vi" })
        .then((res) => res[0])
        .then(async (res) => {
            const total = !(res.meta.length > 0) ? 0 : res.meta[0].total;
            let totalPage = Math.ceil(total / params.size);
            totalPage = totalPage > 0 ? totalPage : 1;
            for (let i = 0; i < res.data.length; i++) {
                const e = res.data[i];
                const fullName = await User.findOne({ id: e.id });
                Object.assign(e, { fullname: fullName?.fullname });
            }
            return {
                page: Number(params.page),
                total: total,
                total_page: totalPage,
                data: res.data,
            };
        });
    return success.ok(result);
}

export async function getUsersNotCustomerPortal(params: {
    query?: string;
    sort?: string;
    userTenant?: string;
}): Promise<Result> {
    let filter: FilterQuery<IUser> = { is_active: true };
    let sort: undefined | Record<string, 1 | -1> = undefined;
    params.userTenant && (filter.tenant = params.userTenant);
    try {
        const userFilter = params.query && parseQuery(params.query);
        userFilter && (filter = { $and: [filter, userFilter] });
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

    let role_ids: string[] = [];
    const response_role = await findRoleNotCustomer(params.userTenant);
    if (response_role.status !== HttpStatus.OK) {
        throw error.service(response_role.path);
    }
    if (response_role.body && response_role.body.length > 0) {
        role_ids = response_role.body;
    }

    const lookup = (
        field: string,
        as?: string
    ): PipelineStage.Lookup["$lookup"] => {
        const newField = as ? as : field;
        return {
            from: "accounts",
            let: { email: `$${field}` },
            as: newField,
            pipeline: [
                {
                    $match: {
                        $and: [
                            { $expr: { $eq: ["$$email", "$email"] } },
                            { roles: { $in: role_ids } },
                        ],
                    },
                },
                { $project: { roles: 1, _id: 0 } },
            ],
        };
    };
    const pipeline: PipelineStage[] = [{ $match: filter }];
    sort && pipeline.push({ $sort: sort });
    pipeline.push(
        { $lookup: lookup("email", "role") },
        {
            $replaceRoot: {
                newRoot: {
                    $mergeObjects: [{ $arrayElemAt: ["$role", 0] }, "$$ROOT"],
                },
            },
        },
        {
            $match: {
                roles: { $exists: true },
            },
        },
        { $project: { _id: 0, activities: 0, role: 0 } }
    );
    const users = await User.aggregate(pipeline)
        .collation({ locale: "vi" })
        .then((res) => {
            const data = res.filter((e: IUser & { roles: string[] }) => {
                return e.roles.length > 0;
            });
            return {
                data: data,
            };
        });
    const department_ids: string[] = [];
    for (const user of users.data) {
        if (user.department) {
            department_ids.push(user.department);
        }
    }
    const departments = await getDepartmentByIds(department_ids);

    users.data.forEach((e: IUser) => {
        const department = departments.body?.find((i) => i.id == e.department);
        if (department) {
            Object.assign(e, {
                department: {
                    id: department?.id,
                    name: department?.name,
                },
            });
        }
    });

    return success.ok({ data: users.data });
}

export async function getLeaderInGroupsOfUser(params: {
    userId: string;
    tenant?: string;
}): Promise<Result> {
    //get groups by technician
    const groups = await getGroupByUserAndSort({ userId: params.userId });
    if (groups.status !== HttpStatus.OK || groups.data.length === 0) {
        throw error.notFound({
            param: "userId",
            value: params.userId,
            location: "param",
            message: `the group of user ${params.userId} does not exist`,
        });
    }
    //get leaders from group
    const leaders: string[] = [];
    for (const group of groups.data) {
        if (group.leader_id) {
            leaders.push(group.leader_id);
        }
    }
    if (!leaders || leaders.length === 0) {
        return error.invalidData({
            param: "leaders",
            value: leaders,
            description: {
                en: `Groups do not have leaders`,
                vi: `Nhóm hỗ trợ không có trưởng nhóm`,
            },
            message: `the leaders do not exist`,
        });
    }
    //get roles has task permission approve = true
    const roles = (await findRolesHaveApprovalPermission(params.tenant)).body;
    if (!roles || roles.length === 0) {
        return error.invalidData({
            param: "roles",
            value: roles,
            message: "the leaders do not exist",
        });
    }
    const result: string[] = [];
    for (const leader of leaders) {
        //get roles_ of leader
        const roles_leader = (await getRoleById(leader)).data.roles;
        for (const role of roles) {
            for (const role_leader of roles_leader) {
                //compare roles of user with roles of task permission
                if (role.id === role_leader) {
                    const check_leaders = result.find((u) => {
                        return u === leader;
                    });
                    if (!check_leaders) {
                        result.push(leader);
                    }
                }
            }
        }
    }
    //after checkTaskPermission, return leaders[0](if not)
    if (result && result.length !== 0) {
        const leader_res = await User.findOne({ id: result[0] });
        if (leader_res) {
            return success.ok({
                id: result[0],
                fullname: leader_res.fullname,
            });
        }
    }
    return error.invalidData({
        param: "leaders",
        value: result,
        description: {
            en: `Groups do not have leaders`,
            vi: `Nhóm hỗ trợ không có trưởng nhóm`,
        },
        message: `the leaders has permission do not exist`,
    });
}

export async function getUsersHaveApprovalPermission(
    userId: string,
    tenant: string
): Promise<ResultSuccess> {
    //get groups of users
    const groups = await getGroupByUser({ userId });
    if (groups.status !== HttpStatus.OK || groups.data.length === 0) {
        throw error.notFound({
            param: "userId",
            value: userId,
            location: "param",
            message: `the group of user ${userId} does not exist`,
        });
    }
    //get all members of groups
    const users: FindUserReqBody[] = [];
    for (const group of groups.data) {
        if (await checkGroupExistsById({ groupId: group })) {
            const members = await membersOfGroup({
                groupId: group,
                tenant: tenant,
            });
            users.push(...members.data);
        }
    }
    if (!users || users.length === 0) {
        throw error.invalidData({
            param: "users",
            value: users,
            message: "these is not have any users",
        });
    }
    const result: FindUserReqBody[] = [];
    //get roles has task permission approve = true
    const roles = (await findRolesHaveApprovalPermission(tenant)).body;
    if (!roles || roles.length === 0) {
        throw error.invalidData({
            param: "roles",
            value: roles,
            message: "these is not have any roles",
        });
    }
    for (const user of users) {
        //get roles_ of user
        const roles_user = (await getRoleById(user.id)).data.roles;
        for (const role of roles) {
            for (const role_user of roles_user) {
                //compare roles of user with roles of task permission
                if (role.id === role_user) {
                    const check_users = result.find((u: FindUserReqBody) => {
                        return u.id === user.id;
                    });
                    if (!check_users) {
                        result.push(user);
                    }
                }
            }
        }
    }
    return success.ok(result);
}

export async function getUserById(params: {
    id: string;
    tenant?: string;
    userId: string;
    userRoles: string[];
}): Promise<Result> {
    const filter: FilterQuery<IUser> = { id: params.id };
    if (!params.userRoles.includes("SA")) {
        filter["tenant"] = params.tenant;
        if (!params.userRoles.includes("TA") && params.id !== params.userId) {
            return error.actionNotAllowed();
        }
    }
    const [user, account] = await Promise.all([
        User.findOne(filter, { _id: 0, password: 0 }),
        Account.findOne(
            { id: params.id },
            { id: 1, email: 1, roles: 1, created_time: 1, updated_time: 1 }
        ),
    ]);

    if (user && account) {
        if (user.department) {
            const department = await findDepartmentById({
                id: user.department,
            });
            const departmentBrif = {
                id: department.body?.id,
                name: department.body?.name,
            };
            const data = {
                ...user.toObject(),
                department: departmentBrif,
                roles: account?.roles,
            };
            return success.ok(data);
        }
        const data = {
            ...user.toObject(),
            roles: account?.roles,
        };
        return success.ok(data);
    }
    return error.notFound({
        location: "body",
        param: "userId",
        value: params.id,
        message: "the user does not exist",
    });
}

export async function getUserByEmail(params: {
    email: string;
    tenant?: string;
}): Promise<Result> {
    let filter: FilterQuery<IUser>;
    if (params.tenant && params.tenant !== "") {
        filter = {
            email: params.email,
            tenant: params.tenant,
        };
    } else {
        filter = { email: params.email };
    }

    const user = await User.findOne(filter, { _id: 0, password: 0 });
    if (user) {
        const data = {
            ...user.toJSON(),
        };
        return success.ok(data);
    } else {
        return error.notFound({
            location: "body",
            param: "email",
            value: params.email,
            message: "the user does not exist",
        });
    }
}

export async function _getUserById(userId: string): Promise<Result> {
    const user = await User.findOne(
        { id: userId },
        { _id: 0, password: 0 }
    ).lean();
    if (!user) {
        return error.notFound({
            param: "userId",
            value: userId,
            message: `the user does not exist`,
        });
    }
    if (user.department) {
        const department = await findDepartmentById({
            id: user.department,
        });
        const departmentBrif = {
            id: department.body?.id,
            name: department.body?.name,
        };
        Object.assign(user, { department: departmentBrif });
        // return success.ok(data);
    }
    return success.ok(user);
}

export async function __getUserById(userId: string): Promise<Result> {
    const user = await User.findOne(
        { id: userId },
        { _id: 0, password: 0 }
    ).lean();
    if (!user) {
        return error.notFound({
            param: "userId",
            value: userId,
            message: `the user does not exist`,
        });
    }
    return success.ok(user);
}

export async function updateUserActivity(params: {
    id: string;
    action: string;
    actor: string;
}): Promise<void> {
    const user = await User.findOneAndUpdate(
        { id: params.id, is_active: true },
        {
            $push: {
                activities: {
                    action: params.action,
                    actor: params.actor,
                    time: new Date(),
                },
            },
        },
        { projection: { _id: 0 } }
    ).lean();
    if (!user) {
        const err = error.notFound({
            param: "userId",
            value: params.id,
            message: `the user does not exist`,
        });
        throw new HttpError(err);
    }
}

export async function getUserByIds(ids: string[]): Promise<Result> {
    const users = await User.find(
        { id: { $in: ids } },
        { _id: 0, password: 0 }
    ).lean();
    const departmentIds: string[] = [];
    for (const data of users) {
        if (data.department) {
            departmentIds.push(data.department);
        }
    }
    const response = await getDepartmentByIds(departmentIds);
    users.forEach((e) => {
        const department = response.body?.find((i) => i.id == e.department);
        if (department) {
            Object.assign(e, {
                department: { id: department?.id, name: department?.name },
            });
        }
    });

    return success.ok(users);
}

export async function deleteDepartmentOfUser(params: {
    departments: string[];
}): Promise<Result | Error> {
    const uniqueCodes: string[] = [...new Set(params.departments)];
    const filter: FilterQuery<IUser> = {
        department: { $in: uniqueCodes },
    };
    const updateResult = await User.updateMany(
        filter,
        { $unset: { department: 1 } },
        { new: true }
    );
    const matched = updateResult.matchedCount;
    return success.ok({ updated: matched });
}
export async function updateUserActivation(params: {
    ids: string[];
    status: boolean;
    tenant?: string;
    userRoles: string[];
}): Promise<Result | Error> {
    const uniqueIds: string[] = [...new Set(params.ids)];
    const filter: FilterQuery<IUser> = {
        id: { $in: uniqueIds },
    };
    if (!params.userRoles.includes("SA")) {
        filter["tenant"] = params.tenant;
    }

    const session = await mongoose.startSession();
    session.startTransaction();
    const updateResult = await User.updateMany(
        filter,
        { $set: { is_active: params.status } },
        { new: true, session }
    );

    const abortTransaction = async (): Promise<void> => {
        await session.abortTransaction();
        await session.endSession();
    };

    const matched = updateResult.matchedCount;
    if (matched === uniqueIds.length) {
        try {
            await updateAccountActivation({
                ids: [...uniqueIds],
                status: params.status,
            });
        } catch (err) {
            await abortTransaction();
            throw err;
        }

        await session.commitTransaction();
        await session.endSession();
        return success.ok({ updated: matched });
    } else {
        await abortTransaction();
        return error.invalidData({
            location: "body",
            param: "ids",
            value: params.ids,
            message: "some user ids do not exist",
        });
    }
}

export async function importUser(params: {
    importData: ImportUserReqBody;
    userRoles: string[];
    userId: string;
}): Promise<Result> {
    await validateImportData(params);
    const createUser = params.importData.map(async (u) => {
        return {
            id: v1(),
            fullname: u.fullname,
            email: u.email,
            phone: u.phone,
            tenant: u.tenant,
            position: u.position,
            // department: u.department?.length as number > 0 ? u.department : u.department = null,
            created_time: new Date(),
            activities: [
                {
                    action: UserAction.CREATE,
                    actor: params.userId,
                    time: new Date(),
                },
            ],
        };
    });
    const numberUserIncrease: {
        tenant: string;
        amount: number;
    }[] = [];
    params.importData.forEach((u) => {
        if (u.tenant) {
            const record = numberUserIncrease.find(
                (item) => item.tenant === u.tenant
            );
            if (record) {
                record.amount += 1;
            } else {
                numberUserIncrease.push({
                    tenant: u.tenant,
                    amount: 1,
                });
            }
        }
    });

    const users = await Promise.all([...createUser]);
    const accounts = params.importData.map((u) => {
        const id = users.find((m) => m.email === u.email)?.id;
        return {
            id: id as string,
            email: u.email,
            password: "Ab@123456",
            is_active: true,
            roles: ["EU"],
            tenant: u.tenant,
        };
    });
    await Promise.all([
        createAccount(accounts),
        increaseUser(numberUserIncrease),
        User.insertMany(users),
    ]);
    return success.created({ inserted: params.importData.length });
}

async function checkTenantByCode(tenant: string): Promise<void> {
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
            })
        );
    }
}

async function checkEmailExists(email: string): Promise<void> {
    const existedUser = await User.findOne({
        email: { $regex: `^${email}$`, $options: "i" },
    });
    if (existedUser) {
        throw new HttpError({
            status: HttpStatus.BAD_REQUEST,
            code: "REGISTERED_EMAIL",
            errors: [
                {
                    param: "email",
                    location: "body",
                    value: email,
                },
            ],
        });
    }
}

export async function getUserByIdAndTenantCode(params: {
    userid: string;
    tenant: string;
}): Promise<ResultSuccess> {
    await Promise.all([checkTenantByCode(params.tenant)]);
    const user = await User.findOne(
        { id: params.userid, tenant: params.tenant, is_active: { $eq: true } },
        { _id: 0, password: 0 }
    );
    if (!user) {
        throw new HttpError({
            status: HttpStatus.BAD_REQUEST,
            code: "INVALID_DATA",
            description: {
                en: `user id: ${params.userid} does not exist`,
                vi: `user id: ${params.userid} không tồn tại`,
            },
            errors: [
                {
                    param: "params.userid",
                    location: "body",
                    value: `${params.userid}`,
                },
            ],
        });
    }
    return success.ok(user);
}

export async function getUsersByTenantCode(
    tenant: string
): Promise<ResultSuccess> {
    await Promise.all([checkTenantByCode(tenant)]);
    const users = await User.findOne(
        { tenant: tenant },
        { is_active: true },
        { _id: 0, password: 0 }
    ).lean();
    if (!users) {
        throw new HttpError({
            status: HttpStatus.BAD_REQUEST,
            code: "INVALID_DATA",
            description: {
                en: `tenant code: ${tenant} does not exist`,
                vi: `tenant code: ${tenant} không tồn tại`,
            },
            errors: [
                {
                    param: "tenant",
                    location: "body",
                    value: `${tenant}`,
                },
            ],
        });
    }
    return success.ok(users);
}

// check duplicate email
async function validateImportData(params: {
    importData: ImportUserReqBody;
    userRoles: string[];
}): Promise<void> {
    const indexesEmailMissing: number[] = [];
    const indexesPasswordMissing: number[] = [];
    const indexesTenantMissing: number[] = [];
    const indexesTenantNotExist: number[] = [];
    const emails = params.importData.map((u) => u.email);
    const tenants = params.importData
        .map((u) => u.tenant)
        .filter((t) => t !== undefined) as string[];
    const uniqueTenant = [...new Set(tenants)];
    params.importData.forEach((u) => {
        if (!u.email || u.email === "") {
            indexesEmailMissing.push(u.index);
        }

        if (u.password === "") {
            indexesPasswordMissing.push(u.index);
        }

        if (params.userRoles.includes("SA")) {
            if (!u.tenant || u.tenant === "") {
                indexesTenantMissing.push(u.index);
            }
        }
    });
    const users = await User.find({ email: { $in: emails } });
    const indexesEmailExisting = <number[]>params.importData
        .map((e) => {
            const importUser = users.find((iu) => iu.email === e.email);
            return importUser ? e.index : null;
        })
        .filter((u) => u !== null);
    if (uniqueTenant && uniqueTenant.length > 0) {
        const response = await getTenantByCodes(uniqueTenant);
        const existedTenant = response.body
            ?.map((u) => u.code)
            .filter((t) => t !== undefined && t !== null);
        params.importData.forEach((u) => {
            if (!existedTenant?.includes(u.tenant as string)) {
                indexesTenantNotExist.push(u.index);
            }
        });
    }

    const errors: {
        indexes: number[];
        code: string;
        description: {
            vi: string;
            en: string;
        };
    }[] = [];
    if (indexesEmailMissing.length !== 0) {
        errors.push({
            indexes: indexesEmailMissing,
            code: "EMAIL_IS_NOT_VALID",
            description: {
                vi: "Địa chỉ email không hợp lệ",
                en: "Email address is not valid",
            },
        });
    }

    if (indexesEmailExisting.length !== 0) {
        errors.push({
            indexes: indexesEmailExisting,
            code: "REGISTERED_EMAIL",
            description: {
                vi: "Địa chỉ email đã được sử dụng",
                en: "The email is used for registration",
            },
        });
    }

    if (indexesPasswordMissing.length !== 0) {
        errors.push({
            indexes: indexesPasswordMissing,
            code: "PASSWORD_IS_NOT_VALID",
            description: {
                vi: "Mật khẩu không hợp lệ",
                en: "Password is not valid",
            },
        });
    }

    if (indexesTenantMissing.length !== 0) {
        errors.push({
            indexes: indexesTenantMissing,
            code: "TENANT_IS_NOT_VALID",
            description: {
                vi: "Thông tin tenant không hợp lệ",
                en: "Tenant is not valid",
            },
        });
    }

    if (indexesTenantNotExist.length !== 0) {
        errors.push({
            indexes: indexesTenantNotExist,
            code: "TENANT_NOT_FOUND",
            description: {
                vi: "Thông tin tenant không tồn tại",
                en: "Tenant does not exist",
            },
        });
    }

    if (errors.length > 0) {
        throw new HttpError({
            status: HttpStatus.BAD_REQUEST,
            code: "INVALID_DATA",
            details: errors,
            description: {
                vi: "Tệp dữ liệu không hợp lệ",
                en: "File data is not valid",
            },
        });
    }
}

export async function getTemplateUrl(): Promise<Result> {
    const object = "ServiceDeskMBFDT_Template_ImportEndUser_SuperAdmin.xlsx";
    const response = await getDownloadLinks([object]);
    if (response.status === HttpStatus.OK && response.body) {
        return success.ok({ link: response.body[0].link });
    } else {
        return error.notFound({ message: "template object is not configured" });
    }
}

export async function updateAssigneeTicket(params: {
    id: string;
    tenant: string;
    is_auto: boolean;
}): Promise<Result> {
    const user = await User.findOneAndUpdate(
        { id: params.id, tenant: params.tenant },
        { last_time_ticket: new Date(), is_auto: params.is_auto }
    );
    if (user) {
        return success.ok({ data: "Update successfully" });
    } else {
        return error.notFound({
            location: "body",
            param: "id",
            value: params.id,
            message: "the user does not exist",
        });
    }
}

export async function getTotalUserHaveRole(params: {
    role: string;
    tenant?: string;
}): Promise<Result> {
    const { role, tenant } = params;
    const query: FindTotalUserReqQuery = {
        roles: role,
        is_active: true,
    };
    if (tenant) {
        query["tenant.code"] = tenant;
    }
    const total_user = await Account.countDocuments(query);
    return success.ok({ total_user });
}

export async function getAllUsers(params: {
    tenant?: string;
    is_active?: boolean;
}): Promise<ResultSuccess> {
    let filter: FilterQuery<IUser> = {};
    params.tenant && (filter.tenant = params.tenant);
    if (params.is_active != null) {
        filter.is_active = Boolean(params.is_active);
    }

    const pipeline: PipelineStage[] = [
        { $match: filter },
        { $project: { _id: 0, activities: 0 } },
    ];
    const result = await User.aggregate(pipeline).then(async (res) => {
        for (let i = 0; i < res.length; i++) {
            const e = res[i];
            const roles = await Account.findOne({ id: e.id });
            Object.assign(e, { roles: roles?.roles });
        }
        return res;
    });
    const ids: string[] = [];
    for (const data of result) {
        if (data.department) {
            ids.push(data.department);
        }
    }
    const response = await getDepartmentByIds(ids);

    result.forEach((e: IUser) => {
        const department = response.body?.find((i) => i.id == e.department);
        if (department) {
            Object.assign(e, {
                department: {
                    id: department?.id,
                    name: department?.name,
                },
            });
        }
    });
    return success.ok(result);
}

// export async function getAllNotRoleEU(params: {
//     userRoles: string[];
//     userTenant: string;
//     userId: string;
// }): Promise<Result> {
//     let roleIds: string[] = [];
//     const responseRole = await findRoleNotCustomer(params.userTenant);
//     if (responseRole.status == HttpStatus.OK && responseRole.body) {
//         roleIds = responseRole.body;
//     }
//     const lookup = (
//         field: string,
//         as?: string
//     ): PipelineStage.Lookup["$lookup"] => {
//         const newField = as ? as : field;
//         return {
//             from: "accounts",
//             let: { email: `$${field}` },
//             as: newField,
//             pipeline: [
//                 {
//                     $match: {
//                         $and: [
//                             { $expr: { $eq: ["$$email", "$email"] } },
//                             { roles: { $ne: ["EU"] } },
//                         ],
//                     },
//                 },
//                 { $project: { roles: 1, _id: 0 } },
//             ],
//         };
//     };

//     const users = await User.aggregate([
//         {
//             $match: {
//                 tenant: params.userTenant,
//                 is_active: true,
//             },
//         },
//         { $lookup: lookup("email", "role") },
//         {
//             $replaceRoot: {
//                 newRoot: {
//                     $mergeObjects: [{ $arrayElemAt: ["$role", 0] }, "$$ROOT"],
//                 },
//             },
//         },
//         { $project: { _id: 0, activities: 0, role: 0 } },
//     ]);
//     return success.ok(users);
// }

export async function getAllNotRoleEU(params: {
    userRoles: string[];
    userTenant: string;
    userId: string;
}): Promise<Result> {
    const accounts = await Account.find({
        "tenant.code": params.userTenant,
        roles: { $ne: ["EU"] },
    }).lean();
    for (let i = 0; i < accounts.length; i++) {
        const element = accounts[i];
        const users = await User.findOne(
            { id: element.id },
            { fullname: 1, _id: 0 }
        ).lean();
        Object.assign(element, { fullname: users.fullname });
    }
    return success.ok(accounts);
}
