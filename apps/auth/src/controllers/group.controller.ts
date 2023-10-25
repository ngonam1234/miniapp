import {
    error,
    HttpError,
    HttpStatus,
    Result,
    ResultSuccess,
    success,
} from "app";
import { parseQuery, parseSort, ParseSyntaxError } from "mquery";
import { FilterQuery, PipelineStage, Types } from "mongoose";
import { IGroup, IUser } from "../interfaces/models";
import {
    findRoleNotCustomer,
    getDepartmentByIds,
    getTenantByCode,
} from "../services";
import { Account, Group, User } from "../models";
import { v1 } from "uuid";
import { UpdateGroupReqBody } from "../interfaces/request";

export async function createGroup(params: {
    name: string;
    description?: string;
    leader_id?: string;
    tenant: string;
    members?: string[];
    userRoles: string[];
}): Promise<Result> {
    await Promise.all([
        checkTenantExist(params.tenant),
        checkGroupExists({
            name: params.name,
            tenant: params.tenant,
        }),
    ]);

    if (
        params.leader_id &&
        params.members &&
        !params.members.includes(params.leader_id)
    ) {
        return error.invalidData({
            value: params.leader_id,
            param: "leader_id",
            location: "body",
            message: `the leader ${params.leader_id} must be a member`,
        });
    }
    const group = new Group({
        id: v1(),
        name: params.name,
        members: params.members,
        description: params.description,
        tenant: params.tenant,
        leader_id: params.leader_id,
        created_time: new Date(),
    });

    if (params.members && params.members.length > 0) {
        let userIds: string[] = [];
        if (params.members) {
            userIds = [...params.members];
        }
        const uniqueIds: string[] = [...new Set(userIds)];
        const [users, accounts, role_ids] = await Promise.all([
            User.find(
                { id: { $in: uniqueIds } },
                { _id: 0, id: 1, fullname: 1, email: 1, tenant: 1 }
            ),
            Account.find({ id: { $in: uniqueIds } }),
            findRoleNotCustomer(params.tenant),
        ]);
        if (role_ids.status !== HttpStatus.OK) {
            throw error.service(role_ids.path);
        }
        if (role_ids.body && role_ids.body.length > 0) {
            for (const account of accounts) {
                const is_customer_portal = checkUserNotCustomerPortal({
                    userRoles: account.roles,
                    roles: role_ids.body,
                });
                if (is_customer_portal === false) {
                    return error.invalidData({
                        value: account.id,
                        param: "user_id",
                        location: "body",
                        message: `the user_id ${account.id} not be a customer portal`,
                    });
                }
            }
        }

        const leader = users.find((u) => u.id === params.leader_id);
        const result: Omit<IGroup, "members"> & {
            members: IUser[];
            leader?: IUser;
            _id?: Types.ObjectId;
        } = { ...group.toJSON(), members: [], leader };

        for (const element of params.members) {
            const user = users.find((u) => u.id === element);
            if (!user) {
                if (element === params.leader_id) {
                    return error.invalidData({
                        location: "body",
                        param: "leader_id",
                        value: params.leader_id,
                        message: `the user ${element} does not exist`,
                    });
                } else {
                    return error.invalidData({
                        location: "body",
                        param: "members",
                        value: element,
                        message: `the user ${element} does not exist`,
                    });
                }
            } else {
                if (user.tenant !== params.tenant) {
                    if (element === params.leader_id) {
                        return error.invalidData({
                            location: "body",
                            param: "leader_id",
                            value: params.leader_id,
                            message: `the user ${element} does not belong to the tenant ${params.tenant}`,
                        });
                    } else {
                        return error.invalidData({
                            location: "body",
                            param: "members",
                            value: element,
                            message: `the user ${element} does not belong to the tenant ${params.tenant}`,
                        });
                    }
                }
                result.members.push(user);
            }
        }
        await group.save();
        delete result._id;
        delete result.leader_id;
        return success.created(result);
    }
    await group.save();
    return success.created(group);
}

export function checkUserNotCustomerPortal(params: {
    userRoles: string[];
    roles: string[];
}): boolean {
    const is_customer_portal = params.userRoles.some((user_role) =>
        params.roles.includes(user_role)
    );
    return is_customer_portal;
}

export async function updateGroup(
    params: UpdateGroupReqBody & {
        tenant?: string;
        groupId: string;
        userId: string;
        userRoles: string[];
    }
): Promise<Result> {
    const match: FilterQuery<IGroup> = {
        id: params.groupId,
        is_active: true,
    };
    params.tenant && (match["tenant"] = params.tenant);
    let group = await Group.findOne(match);
    if (!group) {
        return error.notFound({
            value: params.groupId,
            param: "groupId",
            location: "param",
            message: `the group does not exist`,
        });
    }
    if (params.userRoles.includes("SA")) {
        params.tenant = group?.tenant;
    }
    if (params.name) {
        await checkGroupExists({
            name: params.name,
            groupId: params.groupId,
            tenant: params.tenant,
        });
    }
    if (
        params.leader_id &&
        params.members &&
        !params.members.includes(params.leader_id)
    ) {
        return error.invalidData({
            value: params.leader_id,
            param: "leader_id",
            location: "body",
            message: `the leader ${params.leader_id} must be a member`,
        });
    }

    if (params.members && params.members.length > 0) {
        const uniqueIds: string[] = [...new Set(params.members)];
        const [users, accounts, roles] = await Promise.all([
            User.find(
                { id: { $in: uniqueIds } },
                { _id: 0, id: 1, fullname: 1, email: 1, tenant: 1 }
            ),
            Account.find({ id: { $in: uniqueIds } }),
            findRoleNotCustomer(params.tenant),
        ]);
        if (roles.status !== HttpStatus.OK) {
            throw error.service(roles.path);
        }
        if (roles.body && roles.body.length > 0) {
            for (const account of accounts) {
                const is_customer_portal = checkUserNotCustomerPortal({
                    userRoles: account.roles,
                    roles: roles.body,
                });
                if (is_customer_portal === false) {
                    return error.invalidData({
                        value: account.id,
                        param: "user_id",
                        location: "body",
                        message: `the user_id ${account.id} not be a customer portal`,
                    });
                }
            }
        }
        const leader = users.find((u) => u.id === params.leader_id);
        const members: IUser[] = [];
        for (const element of params.members ?? []) {
            const user = users.find((u) => u.id === element);
            if (!user) {
                if (element === params.leader_id) {
                    return error.invalidData({
                        location: "body",
                        param: "leader_id",
                        value: params.leader_id,
                        message: `the user ${element} does not exist`,
                    });
                } else {
                    return error.invalidData({
                        location: "body",
                        param: "members",
                        value: element,
                        message: `the user ${element} does not exist`,
                    });
                }
            } else {
                if (user.tenant !== params.tenant) {
                    if (element === params.leader_id) {
                        return error.invalidData({
                            location: "body",
                            param: "leader_id",
                            value: params.leader_id,
                            message: `the user ${element} does not belong to the tenant ${params.tenant}`,
                        });
                    } else {
                        return error.invalidData({
                            location: "body",
                            param: "members",
                            value: element,
                            message: `the user ${element} does not belong to the tenant ${params.tenant}`,
                        });
                    }
                }
                members.push(user);
            }
        }
        group = await Group.findOneAndUpdate(
            match,
            {
                $set: {
                    name: params.name,
                    description: params.description ? params.description : null,
                    members: params.members ? params.members : null,
                    leader_id: params.leader_id ? params.leader_id : null,
                },
            },
            { new: true, projection: { _id: 0 } }
        );
        const newGroup = group?.toJSON() as NonNullable<IGroup>;
        const result: Omit<IGroup, "members"> & {
            members: IUser[];
            leader?: IUser;
        } = { ...newGroup, members, leader };
        delete result.leader_id;
        return success.ok(result);
    }
    group = await Group.findOneAndUpdate(
        match,
        {
            $set: {
                name: params.name,
                description: params.description ? params.description : null,
                members: params.members ? params.members : null,
                leader_id: params.leader_id ? params.leader_id : null,
            },
        },
        { new: true, projection: { _id: 0 } }
    );
    return success.ok(group);
}

export async function removeMemberFromGroup(member: string): Promise<Result> {
    const user = await User.findOne(
        { id: member },
        { _id: 0, password: 0 },
        { is_active: true }
    ).lean();
    if (!user) {
        return error.notFound({
            param: "userId",
            value: member,
            message: `the user does not exist`,
        });
    }
    await Group.bulkWrite([
        {
            updateMany: {
                filter: {
                    members: { $in: [member] },
                    is_active: true,
                    tenant: user.tenant,
                },
                update: {
                    $pull: { members: member },
                },
            },
        },
        {
            updateMany: {
                filter: {
                    leader_id: { $eq: member },
                    is_active: true,
                    tenant: user.tenant,
                },
                update: {
                    $unset: { leader_id: "" },
                },
            },
        },
    ]);
    return success.ok({ message: "success" });
}

export async function deleteGroup(params: {
    tenant?: string;
    groupId: string;
    userId: string;
    userRoles: string[];
}): Promise<Result> {
    const match: FilterQuery<IGroup> = {
        id: params.groupId,
        is_active: true,
    };
    params.tenant && (match["tenant"] = params.tenant);

    let group = await Group.findOne(match);
    if (!group) {
        return error.notFound({
            value: params.groupId,
            param: "groupId",
            location: "param",
            message: `the group ${params.groupId} does not exist`,
        });
    }
    group = await Group.findOneAndUpdate(
        match,
        { is_active: false },
        { new: true, projection: { _id: 0 } }
    );
    return success.ok(group);
}

export async function deleteGroups(params: {
    tenant?: string;
    groupIds: string[];
    userId: string;
    userRoles: string[];
}): Promise<Result> {
    const match: FilterQuery<IGroup> = {
        id: {
            $in: params.groupIds,
        },
        is_active: true,
    };
    params.tenant && (match["tenant"] = params.tenant);

    const groups = await Group.find(match, { _id: 0, id: 1 });
    if (!groups) {
        return error.notFound({
            value: params.groupIds,
            param: "groupId",
            location: "param",
            message: `the group ${params.groupIds} does not exist`,
        });
    } else {
        if (params.groupIds.length !== groups.length) {
            const groupIdNotExist = params.groupIds.filter((id) => {
                if (
                    groups.find((g) => {
                        return g.id === id;
                    })
                ) {
                    return false;
                }
                return true;
            });

            if (groupIdNotExist.length > 0) {
                return error.notFound({
                    value: params.groupIds,
                    param: "groupIds",
                    location: "param",
                    message: `the group ${groupIdNotExist} does not exist`,
                });
            }
        }
    }
    const result = await Group.updateMany(
        match,
        { is_active: false },
        { new: true, projection: { _id: 0 } }
    );
    return success.ok({
        message: `Successfully deleted  ${result.modifiedCount}/${params.groupIds.length}`,
    });
}

export async function findGroup(params: {
    query?: string;
    sort?: string;
    size: number;
    page: number;
    tenant?: string;
    userRoles: string[];
    userId: string;
}): Promise<Result> {
    const pipeline: PipelineStage[] = [];
    let filter: FilterQuery<IGroup> = { is_active: true };
    let sort: Record<string, 1 | -1> = { created_time: -1 };
    params.tenant && (filter.tenant = params.tenant);

    try {
        if (params.query) {
            const uFilter = parseQuery(params.query);
            filter = { $and: [filter, uFilter] };
        }
        if (params.sort) {
            params.sort = params.sort.replace("leader=", "leader.fullname=");
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
    // if (!params.userRoles.includes("SA") && !params.userRoles.includes("TA")) {
    //     const tmpCondition = {
    //         $or: [{ members: params.userId }, { leader_id: params.userId }],
    //     };
    //     if (filter?.$and && filter.$and.length > 0) {
    //         filter.$and.push(tmpCondition);
    //     } else if (filter) {
    //         filter = { $and: [filter, tmpCondition] };
    //     }
    // }
    filter ? pipeline.push({ $match: filter }) : null;
    const lookup = (
        field: string,
        as?: string
    ): PipelineStage.Lookup["$lookup"] => {
        const newField = as ? as : field;
        return {
            from: "users",
            let: { id: `$${field}` },
            as: newField,
            pipeline: [
                { $match: { $expr: { $eq: ["$$id", "$id"] } } },
                { $project: { _id: 0, activities: 0, tenant: 0 } },
            ],
        };
    };
    const project = {
        _id: 0,
        id: 1,
        name: 1,
        created_time: 1,
        tenant: 1,
        leader_id: 1,
        members: 1,
        number_of_user: { $size: "$members" },
    };
    const facet = {
        meta: [{ $count: "total" }],
        data: [
            { $skip: params.size * params.page },
            { $limit: params.size * 1 },
        ],
    };

    pipeline.push(
        { $project: project },
        { $lookup: lookup("leader_id", "leader") },
        { $set: { leader: { $first: "$leader" } } }
    );
    sort ? pipeline.push({ $sort: sort }) : null;

    pipeline.push({ $facet: facet });
    const result = await Group.aggregate(pipeline)
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

export async function getAllGroup(params: {
    tenant?: string;
}): Promise<Result> {
    const filter: FilterQuery<IGroup> = {
        is_active: true,
    };
    params.tenant ? (filter.tenant = params.tenant) : null;
    const result = await Group.find(filter, { _id: 0 });
    return success.ok(result);
}

export async function getGroupByUser(params: {
    userId?: string;
}): Promise<ResultSuccess> {
    const infoUserId: string[] = [];
    const result = await Group.aggregate([
        {
            $lookup: {
                from: "users",
                localField: "members",
                foreignField: "id",
                as: "users",
            },
        },
        {
            $match: {
                "users.id": params.userId,
            },
        },
        {
            $project: { id: 1, _id: 0 },
        },
    ]);
    for (let i = 0; i < result.length; i++) {
        const element = result[i];
        infoUserId.push(element.id);
    }
    return success.ok(infoUserId);
}

export async function getGroupByUserAndSort(params: {
    userId: string;
}): Promise<ResultSuccess> {
    const result = await Group.aggregate([
        {
            $lookup: {
                from: "users",
                localField: "members",
                foreignField: "id",
                as: "users",
            },
        },
        {
            $match: {
                "users.id": params.userId,
                is_active: true,
            },
        },
        {
            $project: {
                _id: 1,
                id: 1,
                name: 1,
                tenant: 1,
                description: 1,
                created_time: 1,
                is_active: 1,
                members: { $first: "$members" },
                leader_id: 1,
            },
        },
        {
            $sort: {
                created_time: 1,
            },
        },
    ]);
    return success.ok(result);
}

export async function membersOfGroup(params: {
    groupId: string;
    tenant?: string;
}): Promise<ResultSuccess> {
    const match: FilterQuery<IGroup> = {
        id: params.groupId,
        is_active: true,
    };
    params.tenant && (match.tenant = params.tenant);
    const lookup = (
        field: string,
        as?: string
    ): PipelineStage.Lookup["$lookup"] => {
        const newField = as ? as : field;
        return {
            from: "users",
            let: { id: `$${field}` },
            as: newField,
            pipeline: [
                { $match: { $expr: { $eq: ["$$id", "$id"] } } },
                { $project: { _id: 0, activities: 0 } },
            ],
        };
    };

    const project = {
        _id: 1,
        members: { $first: "$members" },
        leader: { $first: "$leader" },
    };

    const group = {
        _id: "$_id",
        members: { $push: "$members" },
        leader: { $first: "$leader" },
    };

    const result = await Group.aggregate([
        { $match: match },
        {
            $unwind: {
                path: "$members",
                preserveNullAndEmptyArrays: true,
            },
        },
        { $lookup: lookup("members") },
        { $lookup: lookup("leader_id", "leader") },
        { $project: project },
        { $group: group },
        { $project: { _id: 0 } },
    ]);
    if (result.length > 0) {
        const members = [...result[0].members].filter(e => e.is_active == true);
        if (result[0].leader) {
            members.push(result[0].leader);
        }
        const departmentIds = members
            .filter((e) => e.department)
            .map((e) => e.department);
        if (departmentIds.length > 0) {
            const response = await getDepartmentByIds(departmentIds);
            members.forEach((e) => {
                const department = response.body?.find(
                    (i) => i.id == e.department
                );
                if (department) {
                    Object.assign(e, {
                        department: {
                            id: department?.id,
                            name: department?.name,
                        },
                    });
                }
            });
        }

        return success.ok(members);
    } else {
        throw error.notFound({
            param: "groupId",
            value: params.groupId,
            location: "param",
            message: `the group ${params.groupId} does not exist`,
        });
    }
}

export async function getGroupById(params: {
    groupId: string;
    tenant?: string;
    userId?: string;
    userRoles: string[];
}): Promise<Result> {
    const match: FilterQuery<IGroup> = {
        id: params.groupId,
        is_active: true,
    };
    params.tenant ? (match["tenant"] = params.tenant) : null;
    const lookup = (
        field: string,
        as?: string
    ): PipelineStage.Lookup["$lookup"] => {
        const newField = as ? as : field;
        return {
            from: "users",
            let: { id: `$${field}` },
            as: newField,
            pipeline: [
                { $match: { $expr: { $eq: ["$$id", "$id"] } } },
                { $project: { _id: 0, activities: 0, tenant: 0 } },
            ],
        };
    };

    const project = {
        _id: 1,
        id: 1,
        name: 1,
        tenant: 1,
        description: 1,
        created_time: 1,
        is_active: 1,
        members: { $first: "$members" },
        leader: { $first: "$leader" },
    };

    const group = {
        _id: "$_id",
        id: { $first: "$id" },
        name: { $first: "$name" },
        description: { $first: "$description" },
        tenant: { $first: "$tenant" },
        created_time: { $first: "$created_time" },
        is_active: { $first: "$is_active" },
        members: { $push: "$members" },
        leader: { $first: "$leader" },
    };

    const groups = await Group.aggregate([
        { $match: match },
        {
            $unwind: {
                path: "$members",
                preserveNullAndEmptyArrays: true,
            },
        },
        { $lookup: lookup("members") },
        { $lookup: lookup("leader_id", "leader") },
        { $project: project },
        { $group: group },
        { $project: { _id: 0 } },
    ]);
    if (groups.length > 0) {
        return success.ok(groups[0]);
    } else {
        return error.notFound({
            param: "groupId",
            value: params.groupId,
            location: "param",
            message: `the group ${params.groupId} does not exist`,
        });
    }
}

export async function getGroupByName(params: {
    name: string;
    tenant?: string;
}): Promise<Result> {
    let filter: FilterQuery<IGroup>;
    if (params.tenant && params.tenant !== "") {
        filter = {
            name: params.name,
            tenant: params.tenant,
        };
    } else {
        filter = {
            name: params.name,
        };
    }
    const group = await Group.findOne(filter, { _id: 0 });
    if (group) {
        return success.ok(group);
    } else {
        return error.notFound({
            location: "body",
            param: "name",
            value: params.name,
            message: `the group ${params.name} does not exist`,
        });
    }
}

async function checkGroupExists(params: {
    name: string;
    groupId?: string;
    tenant?: string;
}): Promise<void> {
    const match: FilterQuery<IGroup> = {
        name: {
            $regex: `^${params.name}$`,
            $options: "i",
        },
        is_active: true,
    };
    params.tenant ? (match.tenant = params.tenant) : null;
    const group = await Group.findOne(match);
    if (group) {
        if (params.groupId === group.id) {
            return;
        }
        throw new HttpError({
            status: HttpStatus.BAD_REQUEST,
            code: "INVALID_DATA",
            description: {
                en: "Group name already exists",
                vi: "Tên nhóm đã tồn tại",
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

export async function checkGroupExistsById(params: {
    groupId: string;
}): Promise<boolean> {
    const match: FilterQuery<IGroup> = {
        id: params.groupId,
        is_active: true,
    };
    const group = await Group.findOne(match);
    return group ? true : false;
}

async function checkTenantExist(tenant: string): Promise<void> {
    const response = await getTenantByCode(tenant);
    if (response.status === HttpStatus.NOT_FOUND || !response.body) {
        throw new HttpError(
            error.invalidData({
                value: tenant,
                param: "tenant",
                location: "query",
                message: `tenant with id: ${tenant} does not exists`,
            })
        );
    }

    if (response.body.is_active === false) {
        throw new HttpError(
            error.invalidData({
                value: tenant,
                param: "tenant",
                location: "query",
                message: `tenant with id: ${tenant} is inactive`,
            })
        );
    }
}

export async function getIdByNameGroup(name: string): Promise<Result> {
    const getId = await Group.findOne({ name: name });
    if (!getId) {
        return error.invalidData({
            location: "body",
            param: "name",
            value: name,
            message: "the name is not correct",
            description: {
                vi: "Tên group không tồn tại trong hệ thông, vui lòng kiểm tra lại.",
                en: "The group address does not exist in the system, please check again.",
            },
        });
    }
    return success.ok({ id: getId.id });
}
