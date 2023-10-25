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
import { v1 } from "uuid";
import { IDepartment, ISubDepartment } from "../interfaces/models/department";
import { ImportDepartmentReqBody } from "../interfaces/request";
import { UserResBody } from "../interfaces/response";
import { Department } from "../models/index";
import {
    CheckUserById,
    deleteDepartmentActivation,
    getUserById,
    getUserByIds,
} from "../services";
import { checkTenantByCode } from "./tenant.controller";

async function checkDepartmentExists(params: {
    name: string;
    departmentId?: string;
    tenant?: string;
}): Promise<void> {
    const match: FilterQuery<IDepartment> = {
        name: {
            $regex: `^${params.name}$`,
            $options: "i",
        },
        is_deleted: false,
    };
    params.tenant ? (match.tenant = params.tenant) : null;
    const department = await Department.findOne(match);
    if (department) {
        if (params.departmentId === department.id) {
            return;
        }
        throw new HttpError({
            status: HttpStatus.BAD_REQUEST,
            code: "INVALID_DATA",
            description: {
                en: "Department name already exists",
                vi: "Tên phòng ban đã tồn tại",
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
export async function createDepartment(params: {
    name: string;
    tenant: string;
    description?: string;
    manager?: string;
    approver?: string;
    members?: string[];
    pic?: string;
    sub_departments?: ISubDepartment[];
    is_active: boolean;
}): Promise<Result> {
    let userIds: string[] = [];
    params.manager ? userIds.push(params.manager) : "";
    params.pic ? userIds.push(params.pic) : "";
    userIds =
        params.approver && params.approver?.length !== 0
            ? userIds.concat(params.approver)
            : userIds;
    await Promise.all([
        checkTenantByCode({ code: params.tenant }),
        checkDepartmentExists({
            name: params.name,
            tenant: params.tenant,
        }),
        chechUsersById({ userIds: userIds, tenant: params.tenant }),
    ]);
    const department = new Department({
        id: v1(),
        name: params.name,
        tenant: params.tenant,
        description: params.description,
        manager: params.manager,
        approver: params.approver,
        pic: params.pic,
        sub_departments: params.sub_departments,
        is_active: params.is_active,
        is_deleted: false,
        created_time: Date.now(),
        members: params.members,
    });

    await department.save();
    const data = {
        ...department.toJSON(),
        _id: undefined,
        is_active: undefined,
        is_deleted: undefined,
    };
    return success.created(data);
}

export async function importDepartments(
    importData: ImportDepartmentReqBody
): Promise<ResultSuccess> {
    const departments: IDepartment[] = [];

    for (const params of importData) {
        let userIds: string[] = [];
        params.manager ? userIds.push(params.manager) : "";
        params.pic ? userIds.push(params.pic) : "";
        userIds =
            params.approver && params.approver?.length !== 0
                ? userIds.concat(params.approver)
                : userIds;
        await Promise.all([
            checkTenantByCode({ code: params.tenant }),
            checkDepartmentExists({
                name: params.name,
                tenant: params.tenant,
            }),
            chechUsersById({ userIds: userIds, tenant: params.tenant }),
        ]);

        const department = new Department({
            id: v1(),
            name: params.name,
            tenant: params.tenant,
            description: params.description,
            manager: params.manager,
            approver: params.approver,
            pic: params.pic,
            sub_departments: params.sub_departments,
            is_active: params.is_active,
            is_deleted: false,
            created_time: Date.now(),
            members: params.members,
        });
        departments.push(department);
    }

    const result = await Department.insertMany(departments);

    return success.created({
        inserted: `${result.length}/${importData.length}`,
    });
}

export async function getDepartments(params: {
    userId: string;
    userRoles: string[];
    tenant?: string;
    query?: string;
    sort?: string;
    size: number;
    page: number;
}): Promise<Result> {
    const pipeline: PipelineStage[] = [
        {
            $addFields: {
                numberOfMembers: { $size: "$members" },
            },
        },
    ];
    let filter: FilterQuery<IDepartment> = {
        is_deleted: false,
    };
    let sort: undefined | Record<string, 1 | -1> = undefined;
    params.tenant && (filter.tenant = params.tenant);
    try {
        if (params.query) {
            const dFilter = parseQuery(params.query);
            filter = { $and: [filter, dFilter] };
        }
        filter ? pipeline.push({ $match: filter }) : null;
        if (params.sort) {
            if (params.sort.includes("numberOfMembers")) {
                const numbers = params.sort.split("numberOfMembers=");
                const indexSort = Number(numbers[1]) > 0 ? 1 : -1;
                pipeline.push({ $sort: { numberOfMembers: indexSort } });
            }
            if (!params.sort?.includes("manager")) {
                sort = parseSort(params.sort);
                sort ? pipeline.push({ $sort: sort }) : null;
            }
        } else {
            sort = parseSort("created_time=-1");
            sort ? pipeline.push({ $sort: sort }) : null;
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
    const departments = await Department.aggregate(pipeline);

    const userIds = departments.reduce((container, data) => {
        data.manager && container.push(data.manager);
        data.pic && container.push(data.pic);
        data.approver && container.push(data.approver);
        return container;
    }, []);
    const users = userIds.length !== 0 && (await getUserByIds(userIds));
    const userMap = new Map<string, UserResBody>();

    if (users && users.status !== HttpStatus.OK) {
        throw error.service(users.url);
    }
    if (users && users.body && users.body.length > 0) {
        users.body.forEach((user: UserResBody) => userMap.set(user.id, user));
    }
    const department_details: (Omit<
        IDepartment,
        "manager" | "pic" | "approver"
    > & {
        manager?: UserResBody;
        pic?: UserResBody;
        approver?: UserResBody;
    })[] = [];
    if (userMap.size !== 0) {
        for (const department of departments) {
            const result: Omit<IDepartment, "manager" | "pic" | "approver"> & {
                manager?: UserResBody;
                pic?: UserResBody;
                approver?: UserResBody;
            } = {
                ...department,
                manager: undefined,
                pic: undefined,
                approver: undefined,
            };
            if (department.manager && userMap.has(department.manager)) {
                const manager = userMap.get(department.manager);
                if (manager) {
                    Object.assign(result, {
                        manager: {
                            id: manager.id,
                            tenant: manager.tenant,
                            fullname: manager.fullname,
                            email: manager.email,
                            is_active: manager.is_active,
                            department: undefined,
                            activities: undefined,
                        },
                    });
                }
            }
            if (department.pic && userMap.has(department.pic)) {
                const pic = userMap.get(department.pic);
                if (pic) {
                    Object.assign(result, {
                        pic: {
                            id: pic.id,
                            tenant: pic.tenant,
                            fullname: pic.fullname,
                            email: pic.email,
                            is_active: pic.is_active,
                            department: undefined,
                            activities: undefined,
                        },
                    });
                }
            }
            if (department.approver && userMap.has(department.approver)) {
                const approver = userMap.get(department.approver);
                if (approver) {
                    Object.assign(result, {
                        approver: {
                            id: approver.id,
                            tenant: approver.tenant,
                            fullname: approver.fullname,
                            email: approver.email,
                            is_active: approver.is_active,
                            department: undefined,
                            activities: undefined,
                        },
                    });
                }
            }
            department_details.push(result);
        }
        //sort by fullname of manager
        if (params.sort?.includes("manager")) {
            const numbers = params.sort.split("manager=");
            const indexSort = Number(numbers[1]) > 0 ? 1 : -1;
            if (indexSort === 1) {
                department_details.sort((a, b) => {
                    const fullname_a = a.manager ? a.manager?.fullname : "";
                    const fullname_b = b.manager ? b.manager?.fullname : "";
                    return fullname_a.localeCompare(fullname_b);
                });
            } else {
                department_details.sort((a, b) => {
                    const fullname_a = a.manager ? a.manager?.fullname : "";
                    const fullname_b = b.manager ? b.manager?.fullname : "";
                    return fullname_b.localeCompare(fullname_a);
                });
            }
        }
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
    pipeline.push({ $project: { _id: 0 } }, { $facet: facet });
    const response = await Department.aggregate(pipeline)
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
    if (department_details.length !== 0) {
        response.data = department_details;
    }
    return success.ok(response);
}

export async function findDepartmentById(params: {
    id: string;
    is_internal: boolean;
}): Promise<Result> {
    await Promise.all([checkDepartmentById({ ...params })]);
    const data = await Department.findOne({
        id: params.id,
    });
    if (data) {
        const result: Omit<
            IDepartment,
            "manager" | "pic" | "approver" | "members" | "updated_by"
        > & {
            manager?: UserResBody;
            pic?: UserResBody;
            approver?: UserResBody;
            members?: UserResBody[];
            updated_by?: string;
        } = {
            ...data.toJSON(),
            manager: undefined,
            pic: undefined,
            approver: undefined,
            members: undefined,
            updated_by: undefined,
        };
        if (params.is_internal) {
            const ids: string[] = [];

            data?.manager ? ids.push(data.manager) : "";
            data?.pic ? ids.push(data.pic) : "";
            data?.approver ? ids.push(data.approver) : "";
            data?.members ? ids.push(...data.members) : "";
            data?.updated_by ? ids.push(data.updated_by) : "";

            const users = await getUserByIds(ids);
            if (users.body) {
                if (data.manager) {
                    const manager = users.body.find(
                        (u) => u.id === data.manager
                    );
                    if (manager) {
                        Object.assign(result, {
                            manager: {
                                id: manager.id,
                                tenant: manager.tenant,
                                fullname: manager.fullname,
                                email: manager.email,
                                is_active: manager.is_active,
                                department: manager.department,
                                activities: undefined,
                            },
                        });
                    }
                    // result.manager = manager;
                }

                if (data.pic) {
                    const pic = users.body.find((u) => u.id === data.pic);
                    if (pic) {
                        Object.assign(result, {
                            pic: {
                                id: pic.id,
                                tenant: pic.tenant,
                                fullname: pic.fullname,
                                email: pic.email,
                                is_active: pic.is_active,
                                department: pic.department,
                                activities: undefined,
                            },
                        });
                    }
                    // result.pic = pic;
                }
                if (data.approver) {
                    const approver = users.body.find(
                        (u) => u.id === data.approver
                    );
                    if (approver) {
                        Object.assign(result, {
                            approver: {
                                id: approver.id,
                                tenant: approver.tenant,
                                fullname: approver.fullname,
                                email: approver.email,
                                is_active: approver.is_active,
                                department: approver.department,
                                activities: undefined,
                            },
                        });
                    }
                    // result.approver = approver;
                }
                if (data.members) {
                    const members: UserResBody[] = [];

                    data.members.map((id) => {
                        const member = users.body?.find((u) => u.id === id);
                        if (member) {
                            const temp: UserResBody = {
                                id: member.id,
                                tenant: member.tenant,
                                fullname: member.fullname,
                                email: member.email,
                                is_active: member.is_active,
                                department: member.department,
                                activities: undefined,
                            };
                            members.push(temp);
                        }
                    });
                    result.members = members;
                }
                if (data.updated_by) {
                    const updated_by = users.body.find(
                        (u) => u.id === data.updated_by
                    );

                    result.updated_by = updated_by?.fullname;
                }
            }
        }
        return success.ok(result);
    }
    return success.ok({});
}
export async function getDepartmentByIds(ids: string[]): Promise<Result> {
    const departments = await Department.find(
        { id: { $in: ids } },
        { _id: 0 }
    ).lean();
    return success.ok(departments);
}

export async function getAllDepartment(tenant: string): Promise<Result> {
    const departments = await Department.find({
        tenant: tenant,
        is_active: true,
        is_deleted: false,
    }).lean();
    return success.ok(departments);
}
export async function addRelationship(params: {
    tenant: string;
    parent: string;
    sub_department: ISubDepartment[];
}): Promise<Result | Error> {
    await Promise.all([
        checkTenantByCode({ code: params.tenant }),
        checkRelationship({
            tenant: params.tenant,
            sub_department: params.sub_department,
        }),
        checkDepartmentById({ id: params.parent }),
        (): void => {
            for (const department of params.sub_department) {
                checkDepartmentById({
                    id: department.id,
                });
            }
        },
    ]);

    let newSub: ISubDepartment[] = [];
    const duplicateSub: ISubDepartment[] = [];

    const department = await Department.findOne(
        { id: params.parent },
        { _id: 0, is_active: 0, is_deleted: 0 }
    );
    if (department) {
        newSub = params.sub_department
            .concat(department.sub_departments)
            .filter(function (item) {
                return newSub.find((n) => {
                    if (n.id === item.id) {
                        duplicateSub.find((d) => {
                            return d.id === n.id;
                        })
                            ? ""
                            : duplicateSub.push(n);
                    }
                    return n.id === item.id;
                })
                    ? ""
                    : newSub.push(item);
            });
    }

    const departmentUpdate = await Department.findOneAndUpdate(
        { id: params.parent, is_deleted: false },
        {
            $set: {
                sub_departments: newSub,
            },
        },
        { new: true, projection: { _id: 0, is_active: 0, is_deleted: 0 } }
    );

    return success.ok({
        departmentUpdate: departmentUpdate,
        duplicateSub: duplicateSub,
    });
}

async function checkRelationship(params: {
    tenant: string;
    sub_department: ISubDepartment[];
}): Promise<void> {
    await Promise.all([checkTenantByCode({ code: params.tenant })]);

    for (const sub of params.sub_department) {
        const result = await getParentDepartment(sub.id, params.tenant);
        if (result.data) {
            throw new HttpError({
                status: HttpStatus.BAD_REQUEST,
                code: "INVALID_DATA",
                description: {
                    en: `department id: ${sub.id} was a child of a department`,
                    vi: `department id: ${sub.id} đã là con một department `,
                },
                errors: [
                    {
                        param: "sub_department.id",
                        location: "body",
                        value: `${sub.id}`,
                    },
                ],
            });
        }
    }
}

export async function getParentDepartment(
    id: string,
    tenant: string
): Promise<ResultSuccess> {
    const department = await Department.findOne(
        {
            tenant: tenant,
            sub_departments: {
                $elemMatch: {
                    id: id,
                    is_deleted: false,
                },
            },
        },
        { _id: 0, is_active: 0, is_deleted: 0 }
    );
    return success.ok(department);
}

export async function getSubDepartment(
    id: string,
    tenant: string
): Promise<Result> {
    const department = await Department.findOne(
        {
            id: id,
            tenant: tenant,
            is_deleted: false,
        },
        { sub_departments: 1, _id: 0 }
    );

    return success.ok({ department });
}

export async function removeRelationship(params: {
    tenant: string;
    department: string;
    child_department: string;
}): Promise<Result> {
    const departmentId: string[] = [params.department, params.child_department];

    await Promise.all([
        checkTenantByCode({ code: params.tenant }),
        (): void => {
            for (const department of departmentId) {
                checkDepartmentById({
                    id: department,
                });
            }
        },
    ]);

    let newSub: ISubDepartment[] = [];
    const department = await getParentDepartment(
        params.child_department,
        params.tenant
    );
    const temp = department.data.department as IDepartment;

    if (department.data.department !== null) {
        newSub = temp.sub_departments.filter((s) => {
            return s.id !== params.child_department;
        });

        const departmentUpdate = await Department.findOneAndUpdate(
            { id: params.department, tenant: params.tenant, is_deleted: false },
            {
                sub_departments: newSub,
            },
            { new: true, projection: { _id: 0, is_active: 0, is_deleted: 0 } }
        );

        return success.ok({
            departmentUpdate: departmentUpdate,
        });
    } else {
        throw new HttpError({
            status: HttpStatus.BAD_REQUEST,
            code: "INVALID_DATA",
            description: {
                en: `department id: ${params.department} and id: ${params.child_department} no paternity relationship`,
                vi: `department id: ${params.department} and id: ${params.child_department} không có quan hệ cha con `,
            },
            errors: [
                {
                    param: "department & child_department",
                    location: "body",
                    value: `department ${params.department} \n child_department  ${params.child_department}`,
                },
            ],
        });
    }
}

async function checkDepartmentById(params: { id: string }): Promise<void> {
    const department = await Department.findOne({ id: params.id });
    if (!department) {
        throw new HttpError({
            status: HttpStatus.BAD_REQUEST,
            code: "INVALID_DATA",
            description: {
                en: `department id: ${params.id} dose not exits`,
                vi: `department id: ${params.id} không tồn tại`,
            },
            errors: [
                {
                    param: "params.id",
                    location: "body",
                    value: `${params.id}`,
                },
            ],
        });
    }
}

async function updateSubDepartment(params: {
    department_id?: string;
    name?: string;
    description?: string;
    is_active?: boolean;
}): Promise<void> {
    const filter: FilterQuery<IDepartment> = {
        sub_departments: {
            $elemMatch: {
                id: params.department_id,
            },
        },
    };
    const update = {
        $set: {
            "sub_departments.$[elem].name": params.name,
            "sub_departments.$[elem].description": params.description,
            "sub_departments.$[elem].is_active": params.is_active,
        },
    };
    await Department.updateOne(filter, update, {
        arrayFilters: [{ "elem.id": `${params.department_id}` }],
        new: true,
        projection: { id: 0, _id: 0 },
    });
}

export async function updateDepartment(params: {
    id: string;
    tenant: string;
    name: string;
    description?: string;
    manager?: string;
    approver?: string;
    pic?: string;
    departments?: ISubDepartment[];
    is_active: boolean;
    updated_by: string;
}): Promise<Result> {
    const userIds: string[] = [];
    params.manager ? userIds.push(params.manager) : "";
    params.pic ? userIds.push(params.pic) : "";
    params.approver ? userIds.concat(params.approver) : "";

    await Promise.all([
        checkTenantByCode({ code: params.tenant }),
        checkDepartmentExists({
            name: params.name,
            tenant: params.tenant,
            departmentId: params.id,
        }),
        checkDepartmentById({
            id: params.id,
        }),
        (): void => {
            if (params.departments) {
                for (const department of params.departments) {
                    checkDepartmentById({
                        id: department.id,
                    });
                }
            }
        },
        chechUsersById({ userIds: userIds, tenant: params.tenant }),
    ]);

    const department = await Department.findOneAndUpdate(
        { id: params.id },
        {
            $set: {
                name: params.name,
                description: params.description,
                manager: params.manager,
                approver: params.approver,
                pic: params.pic,
                tenant: params.tenant,
                sub_departments: params.departments,
                is_active: params.is_active,
                updated_time: new Date(),
                updated_by: params.updated_by,
            },
        },
        { new: true, projection: { id: 0, _id: 0 } }
    );
    updateSubDepartment({
        department_id: params.id,
        name: params.name,
        description: params.description,
        is_active: params.is_active,
    });
    return success.ok(department);
}

export async function deleteDepartment(id: string): Promise<Result | Error> {
    await Promise.all([
        (): void => {
            checkDepartmentById({
                id: id,
            });
        },
    ]);

    const filter: FilterQuery<IDepartment> = {
        id: {
            $in: id,
        },
    };
    const update = {
        $set: { is_deleted: true },
    };
    const result = await Department.updateOne(filter, update, {
        new: true,
        _id: 0,
    });

    const id_arr: string[] = [];
    id_arr[0] = id;

    if (result.matchedCount === 1) {
        await Promise.all([
            deleteDepartmentActivation({
                departments: id_arr,
            }),
            deleteSubDepartments({ department_ids: id_arr }),
        ]);
        return success.ok({ updated: id_arr.length });
    }
    return error.invalidData({
        location: "body",
        param: "id",
        value: id_arr,
        message: "department doesn't exist",
    });
}

export async function deleteDepartments(params: {
    department_ids: string[];
}): Promise<Result | Error> {
    await Promise.all([
        (): void => {
            for (const department of params.department_ids) {
                checkDepartmentById({
                    id: department,
                });
            }
        },
    ]);
    const filter: FilterQuery<IDepartment> = {
        id: {
            $in: params.department_ids,
        },
    };
    const update = {
        $set: { is_deleted: true },
    };
    const result = await Department.updateMany(filter, update, {
        new: true,
        _id: 0,
    });
    if (result.matchedCount === params.department_ids.length) {
        await Promise.all([
            deleteDepartmentActivation({
                departments: params.department_ids,
            }),
            deleteSubDepartments({ department_ids: params.department_ids }),
        ]);

        return success.ok({ updated: params.department_ids.length });
    }

    return error.invalidData({
        location: "body",
        param: "params.department_ids",
        value: params.department_ids,
        message: "some department ids do not exist",
    });
}

async function deleteSubDepartments(params: {
    department_ids: string[];
}): Promise<Result> {
    const filter: FilterQuery<IDepartment> = {
        //sub_departments has is_deleted=false in
        //department has is_deleted=false
        sub_departments: {
            $elemMatch: {
                id: { $in: params.department_ids },
                is_deleted: false,
            },
        },
        is_deleted: false,
    };
    const update = {
        $pull: {
            sub_departments: { id: { $in: params.department_ids } },
        },
    };
    const result = await Department.updateMany(filter, update);
    if (result.matchedCount === params.department_ids.length) {
        return success.ok({ updated: params.department_ids.length });
    }
    return error.invalidData({
        location: "body",
        param: "params.department_ids",
        value: params.department_ids,
        message: "some department ids do not exist",
    });
}

export async function addMemberToDepartment(params: {
    department: string;
    user: string;
}): Promise<Result> {
    const [user, department] = await Promise.all([
        getUserById(params.user),
        Department.findOne({ id: params.department }),
    ]);

    if (!user.body || user.status !== HttpStatus.OK) {
        return error.invalidData({
            location: "body",
            param: "user",
            value: params.user,
            message: "the user does not exist",
        });
    }

    if (!department) {
        return error.invalidData({
            location: "body",
            param: "department",
            value: params.department,
            message: "the department does not exist",
        });
    }

    if (department.tenant !== user.body.tenant) {
        return error.invalidData({
            location: "body",
            param: "body",
            value: params,
            message: "tenant of user and department are not same",
        });
    }

    await Promise.all([
        Department.updateOne(
            { members: { $in: params.user } },
            { $pull: { members: params.user } }
        ),
        Department.findOneAndUpdate(
            { id: params.department },
            { $push: { members: params.user } }
        ),
    ]);
    return success.ok({ message: "success" });
}

export async function removeMemberFromDepartment(params: {
    department: string;
    user: string;
}): Promise<Result> {
    const [user, department] = await Promise.all([
        getUserById(params.user),
        Department.findOne({ id: params.department }),
    ]);

    if (!user.body || user.status !== HttpStatus.OK) {
        return error.invalidData({
            location: "body",
            param: "user",
            value: params.user,
            message: "the user does not exist",
        });
    }

    if (!department) {
        return error.invalidData({
            location: "body",
            param: "department",
            value: params.department,
            message: "the department does not exist",
        });
    }

    if (department.tenant !== user.body.tenant) {
        return error.invalidData({
            location: "body",
            param: "body",
            value: params,
            message: "tenant of user and department are not same",
        });
    }

    await Department.updateOne(
        { members: { $in: params.user } },
        { $pull: { members: params.user } }
    );
    return success.ok({ message: "success" });
}

export async function checkMember(member: string): Promise<void> {
    const checkMember = await Department.findOne({
        members: { $elemMatch: { $in: [member] } },
    });
    if (checkMember) {
        throw new HttpError({
            status: HttpStatus.BAD_REQUEST,
            code: "INVALID_DATA",
            description: {
                en: `member id: ${member} already belong to a department`,
                vi: `member id: ${member} đã thuộc một phòng ban`,
            },
            errors: [
                {
                    param: "params.member",
                    location: "body",
                    value: `${member}`,
                },
            ],
        });
    }
}

async function chechUsersById(params: {
    userIds: string[];
    tenant: string;
}): Promise<void> {
    if (params.userIds.length !== 0) {
        for (const id of params.userIds) {
            await Promise.all([CheckUserById(id, params.tenant)]);
        }
    }
}
