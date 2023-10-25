import {
    ETaskAction,
    ETaskApprovalStatus,
    ICommentTask,
    IUser,
} from "../interfaces/models";
import { CreateTaskReqBody, UpdateTaskReqBody } from "../interfaces/request";
import Task from "../models/task";
import { v1 } from "uuid";
import { findRoleByIds, getGroupById, getUserById } from "../service";
import {
    error,
    HttpError,
    HttpStatus,
    Result,
    ResultSuccess,
    success,
} from "app";
import { FilterQuery, PipelineStage, UpdateQuery } from "mongoose";
import { parseQuery, parseSort, ParseSyntaxError } from "mquery";
import { ITask } from "../interfaces/models";
import { isNullOrUndefined } from "utils";
import { getStatusTicketById } from "./ticket.controller";
import { getTaskTypeById } from "./task-type.controller";
import { RoleType } from "../interfaces/response";

export async function createTask(
    params: CreateTaskReqBody & {
        ticket_id: string;
        tenant?: string;
        userId: string;
        userRoles: string[];
    }
): Promise<Result> {
    const response = await findRoleByIds(
        params.userRoles,
        params.tenant as string
    );
    let isAdd = false;
    if (response.status === HttpStatus.OK) {
        const roles = response.body;
        if (roles && roles.length > 0) {
            roles.map((role) => {
                if (
                    ((role.type.includes(RoleType.DEFAULT) &&
                        (role.id === "L1-REQUEST" ||
                            role.id === "L2-REQUEST")) ||
                        role.type.includes(RoleType.EMPLOYEE)) &&
                    role.task_permission.add
                ) {
                    isAdd = true;
                }
            });
        }
    }
    if (!isAdd) {
        return error.actionNotAllowed();
    }
    const status = await getStatusTicketById(params.ticket_id);
    if (
        status === "89e2748a-ad11-11ed-afa1-0242ac120002" ||
        status === "89e27354-ad11-11ed-afa1-0242ac120002"
    ) {
        throw new HttpError({
            status: HttpStatus.BAD_REQUEST,
            code: "INVALID_DATA",
            description: {
                en: "Ticket is in canceled or closed status",
                vi: `Ticket đang ở trạng thái cancelled or closed`,
            },
            errors: [
                {
                    param: "ticket_id",
                    location: "param",
                    value: params.ticket_id,
                },
            ],
        });
    }
    const now = new Date();

    const [type, group, technician, created_by, approver] = await Promise.all([
        params.type
            ? await getTaskTypeById({
                  id: params.type,
                  userRoles: params.userRoles,
                  userTenant: params.tenant,
              })
            : undefined,
        getGroupById({
            group: params.group,
            tenant: params.tenant as string,
        }),
        getUserById(params.technician),
        getUserById(params.userId),
        params.approver ? await getUserById(params.approver) : undefined,
    ]);

    if (group.status !== HttpStatus.OK) {
        return error.service(group.path);
    }

    if (technician.status !== HttpStatus.OK) {
        return error.service(technician.url);
    }
    if (created_by.status !== HttpStatus.OK) {
        return error.service(created_by.url);
    }
    const newTask = new Task({
        id: v1(),
        ticket_id: params.ticket_id,
        name: params.name,
        description: params.description,
        type: params.type
            ? {
                  id: type?.data.id,
                  name: type?.data.name,
              }
            : undefined,
        group: {
            id: group?.body?.id,
            name: group?.body?.name,
        },
        technician: {
            id: technician.body?.id,
            fullname: technician.body?.fullname,
            email: technician.body?.email,
        },
        handling_time: params.handling_time,
        estimated_time: {
            begin: params.estimated_time.begin,
            end: params.estimated_time.end,
        },
        actual_time: {
            begin:
                params.actual_time?.begin !== undefined
                    ? params.actual_time?.begin
                    : undefined,
            end:
                params.actual_time?.end !== undefined
                    ? params.actual_time?.end
                    : undefined,
        },
        approver:
            params.approver && approver?.body
                ? {
                      id: approver?.body.id,
                      fullname: approver.body?.fullname,
                      email: approver.body?.email,
                  }
                : undefined,
        status: params.status,
        created_by: created_by.body?.fullname,
        created_time: now,
        needed_approval: params.needed_approval,
    });

    newTask.activities.push({
        action: ETaskAction.CREATE,
        actor: {
            id: created_by.body?.id,
            fullname: created_by.body?.fullname,
            email: created_by.body?.email,
            department: created_by.body?.department
                ? created_by.body?.department
                : undefined,
            is_active: created_by.body?.is_active,
        } as IUser,
        time: now,
    });

    await newTask.save();

    const data = {
        ...newTask.toJSON(),
        _id: undefined,
    };

    return success.ok(data);
}

export async function updateTask(
    params: UpdateTaskReqBody & {
        id: string;
        tenant?: string;
        userId: string;
        userRoles: string[];
    }
): Promise<Result> {
    const response = await findRoleByIds(
        params.userRoles,
        params.tenant as string
    );
    let isEdit = false;
    if (response.status === HttpStatus.OK) {
        const roles = response.body;
        if (roles && roles.length > 0) {
            roles.map((role) => {
                if (
                    ((role.type.includes(RoleType.DEFAULT) &&
                        (role.id === "L1-REQUEST" ||
                            role.id === "L2-REQUEST")) ||
                        role.type.includes(RoleType.EMPLOYEE)) &&
                    role.task_permission.edit
                ) {
                    isEdit = true;
                }
            });
        }
    }
    if (!isEdit) {
        return error.actionNotAllowed();
    }
    const task = await getTaskById({
        id: params.id,
    });
    // checkApprovalStatus(params.id),
    const status = await getStatusTicketById(task.data.ticket_id);
    if (
        status === "89e2748a-ad11-11ed-afa1-0242ac120002" ||
        status === "89e27354-ad11-11ed-afa1-0242ac120002"
    ) {
        throw new HttpError({
            status: HttpStatus.BAD_REQUEST,
            code: "INVALID_DATA",
            description: {
                en: "Ticket is in canceled or closed status",
                vi: `Ticket đang ở trạng thái cancelled or close`,
            },
            errors: [
                {
                    param: "ticket_id",
                    location: "body",
                    value: task.data.ticket_id,
                },
            ],
        });
    }
    const [type, group, technician, updated_by] = await Promise.all([
        params.type
            ? await getTaskTypeById({
                  id: params.type,
                  userRoles: params.userRoles,
                  userTenant: params.tenant,
              })
            : undefined,
        getGroupById({
            group: params.group,
            tenant: params.tenant as string,
        }),
        getUserById(params.technician),
        getUserById(params.userId),
    ]);

    if (group.status !== HttpStatus.OK) {
        return error.service(group.path);
    }

    if (technician.status !== HttpStatus.OK) {
        return error.service(technician.url);
    }

    if (updated_by.status !== HttpStatus.OK) {
        return error.service(updated_by.url);
    }

    const now = new Date();
    const set: UpdateQuery<ITask> = {};
    if (task.data.approval_status === ETaskApprovalStatus.APPROVED) {
        params.status ? (set["status"] = params.status) : "";
        params.actual_time
            ? (set["actual_time"] = {
                  begin: params.actual_time?.begin,
                  end: params.actual_time?.end,
              })
            : "";
        params.added_worklog?.valueOf
            ? (set["added_worklog"] = params.added_worklog)
            : undefined;
    } else if (task.data.approval_status === ETaskApprovalStatus.REJECT) {
        params.added_worklog?.valueOf
            ? (set["added_worklog"] = params.added_worklog)
            : undefined;
    } else {
        params.name ? (set["name"] = params.name) : "";
        type
            ? (set["type"] = {
                  id: type?.data.id,
                  name: type?.data.name,
              })
            : "";
        params.description !== undefined
            ? (set["description"] = params.description)
            : "";
        params.group
            ? (set["group"] = {
                  id: group?.body?.id,
                  name: group?.body?.name,
              })
            : "";
        params.technician
            ? (set["technician"] = {
                  id: technician.body?.id,
                  fullname: technician.body?.fullname,
                  email: technician.body?.email,
              })
            : "";
        params.status ? (set["status"] = params.status) : "";
        params.estimated_time?.end !== undefined
            ? (set["estimated_time.end"] = params.estimated_time?.end)
            : undefined;
        params.estimated_time?.begin !== undefined
            ? (set["estimated_time.begin"] = params.estimated_time?.begin)
            : undefined;
        params.actual_time
            ? (set["actual_time"] = {
                  begin: params.actual_time?.begin,
                  end: params.actual_time?.end,
              })
            : "";
        updated_by ? (set["updated_by"] = updated_by.body?.fullname) : "";
        set["updated_time"] = new Date();
        params.added_worklog?.valueOf
            ? (set["added_worklog"] = params.added_worklog)
            : undefined;
        params.needed_approval &&
        task.data.approval_status === ETaskApprovalStatus.NEEDCLARIFICATION
            ? (set["approval_status"] = ETaskApprovalStatus.WAITINGAPPROVAL)
            : undefined;
    }
    const updateTask = await Task.findOneAndUpdate(
        {
            id: params.id,
            is_deleted: false,
            approval_status: {
                $nin: [],
            },
        },
        {
            $set: set,
        },
        {
            new: true,
        }
    );
    if (!updateTask) {
        throw new HttpError({
            status: HttpStatus.BAD_REQUEST,
            code: "INVALID_DATA",
            description: {
                en: "Task not found",
                vi: `Không tìm thấy Task id: ${params.id}`,
            },
            errors: [
                {
                    param: "id",
                    location: "param",
                    value: params.id,
                },
            ],
        });
    }

    if (params.comment) {
        const newComment: ICommentTask | undefined = {
            id: v1(),
            content: params.comment,
            created_time: new Date(),
            creator: updated_by.body as IUser,
        };
        updateTask.activities.push({
            action: ETaskAction.UPDATE,
            actor: {
                id: updated_by.body?.id,
                fullname: updated_by.body?.fullname,
                email: updated_by.body?.email,
                department: updated_by.body?.department
                    ? updated_by.body?.department
                    : undefined,
                is_active: updated_by.body?.is_active,
            } as IUser,
            time: now,
            comment: newComment,
        });
    } else {
        await Promise.all([
            updateTask.activities.push({
                action: ETaskAction.UPDATE,
                actor: {
                    id: updated_by.body?.id,
                    fullname: updated_by.body?.fullname,
                    email: updated_by.body?.email,
                    department: updated_by.body?.department
                        ? updated_by.body?.department
                        : undefined,
                    is_active: updated_by.body?.is_active,
                } as IUser,
                time: now,
            }),
        ]);
    }

    await updateTask.save();

    return success.ok(updateTask);
}

export async function getTasks(params: {
    userRoles: string[];
    tenant: string;
    userId: string;
    ticketId: string;
    query?: string;
    sort?: string;
    size: number;
    page: number;
}): Promise<Result> {
    let isView = false;
    const response = await findRoleByIds(
        params.userRoles,
        params.tenant as string
    );
    if (response.status === HttpStatus.OK) {
        const roles = response.body;
        if (roles && roles.length > 0) {
            roles.map((role) => {
                if (
                    ((role.type.includes(RoleType.DEFAULT) &&
                        (role.id === "L1-REQUEST" ||
                            role.id === "L2-REQUEST")) ||
                        role.type.includes(RoleType.EMPLOYEE)) &&
                    (role.task_permission.add ||
                        role.task_permission.edit ||
                        role.task_permission.approve ||
                        role.task_permission.delete)
                ) {
                    isView = true;
                }
            });
        }
    }
    if (isView) {
        const pipeline: PipelineStage[] = [];

        let filter: FilterQuery<ITask> = {
            is_deleted: false,
            ticket_id: params.ticketId,
        };

        try {
            if (params.query) {
                const tFilter = parseQuery(params.query);
                filter = { $and: [filter, tFilter] };
            }
            filter ? pipeline.push({ $match: filter }) : null;
            if (params.sort) {
                let sort: undefined | Record<string, 1 | -1> = undefined;
                sort = parseSort(params.sort);
                sort ? pipeline.push({ $sort: sort }) : null;
            } else {
                let sort: undefined | Record<string, 1 | -1> = undefined;
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
        const res = await Task.aggregate(pipeline)
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
        return success.ok(res);
    } else {
        return success.ok({
            page: Number(params.page),
            total: 0,
            total_page: 0,
            data: [],
        });
    }
}

export async function getTaskById(params: {
    id: string;
}): Promise<ResultSuccess> {
    const match: FilterQuery<ITask> = {
        id: params.id,
        is_deleted: false,
    };
    const task = await Task.findOne(match, { _id: 0 });
    if (!task) {
        throw new HttpError(
            error.notFound({
                message: `Task not found`,
            })
        );
    }
    const activites = task.activities;
    activites.sort((a, b) => b.time.getTime() - a.time.getTime());
    task.activities = activites;
    return success.ok(task);
}

export async function doApprovalManyTask(params: {
    userId: string;
    userRoles: string[];
    tenant: string;
    task_ids: string[];
    approval_status: string;
}): Promise<Result> {
    const response = await findRoleByIds(params.userRoles, params.tenant);
    let isApprove = false;
    if (response.status === HttpStatus.OK) {
        const roles = response.body;
        if (roles && roles.length > 0) {
            roles.map((role) => {
                if (
                    ((role.type.includes(RoleType.DEFAULT) &&
                        (role.id === "L1-REQUEST" ||
                            role.id === "L2-REQUEST")) ||
                        role.type.includes(RoleType.EMPLOYEE)) &&
                    role.task_permission.approve
                ) {
                    isApprove = true;
                }
            });
        }
    }
    if (!isApprove) {
        return error.actionNotAllowed();
    }
    const filter: FilterQuery<ITask> = {
        id: {
            $in: params.task_ids,
        },
        "estimated_time.begin": { $exists: true },
        "estimated_time.end": { $exists: true },
        approval_status: {
            $nin: ["REJECT", "APPROVED"],
        },
        is_deleted: false,
    };

    const approver = await getUserById(params.userId);
    if (approver.status !== HttpStatus.OK) {
        return error.service(approver.url);
    }
    const update = {
        $set: {
            approval_status: params.approval_status,
            approved_time: new Date(),
            approver: {
                id: approver.body?.id,
                fullname: approver.body?.fullname,
                email: approver.body?.email,
            },
        },
        $push: {
            activities: {
                id: v1(),
                action: ETaskAction.APPROVE,
                actor: approver.body as IUser,
                time: new Date(),
            },
        },
    };
    const result = await Task.updateMany(filter, update, {
        new: true,
        _id: 0,
    });
    if (result.modifiedCount === 0) {
        throw new HttpError({
            status: HttpStatus.BAD_REQUEST,
            code: "APPROVED_TASK",
            description: {
                en: "Task has already approved",
                vi: "Công việc đã được xử lí",
            },
            errors: [
                {
                    location: "body",
                    param: "task_ids",
                    value: params.task_ids,
                },
            ],
        });
    }
    return success.ok({
        message: `Phê duyệt thành công ${
            result.modifiedCount
        } công việc và không thành công ${
            params.task_ids.length - result.modifiedCount
        } công việc do không có quyền`,
        // updated: result.modifiedCount,
        // number_of_tasks: params.task_ids.length,
    });
}

export async function doApprovalTask(params: {
    userId: string;
    userRoles: string[];
    tenant: string;
    id: string;
    approval_status: string;
    comment?: string;
}): Promise<Result> {
    const responseRole = await findRoleByIds(params.userRoles, params.tenant);
    let isApprove = false;
    if (responseRole.status === HttpStatus.OK) {
        const roles = responseRole.body;
        if (roles && roles.length > 0) {
            roles.map((role) => {
                if (
                    ((role.type.includes(RoleType.DEFAULT) &&
                        (role.id === "L1-REQUEST" ||
                            role.id === "L2-REQUEST")) ||
                        role.type.includes(RoleType.EMPLOYEE)) &&
                    role.task_permission.approve
                ) {
                    isApprove = true;
                }
            });
        }
    }
    if (!isApprove) {
        return error.actionNotAllowed();
    }
    await Promise.all([
        checkApprovalStatus(params.id, false),
        checkTaskValid({
            id: params.id,
            userRoles: params.userRoles,
            tenant: params.tenant,
        }),
        checkComment({
            approval_status: params.approval_status,
            comment: params.comment,
        }),
    ]);

    const response = await Task.findOne({ id: params.id });
    if (response) {
        const approver = await getUserById(params.userId);
        if (approver.status !== HttpStatus.OK) {
            return error.service(approver.url);
        }
        const comment = {
            id: v1(),
            content: params.comment ?? "",
            created_time: new Date(),
            creator: approver.body as IUser,
        };
        const activity = {
            id: v1(),
            action: ETaskAction.APPROVE,
            actor: approver.body as IUser,
            time: new Date(),
            comment: comment,
        };
        const filter: FilterQuery<ITask> = {
            id: params.id,
        };
        const update = {
            $set: {
                approval_status: params.approval_status,
                approved_time: new Date(),
                approver: {
                    id: approver.body?.id,
                    fullname: approver.body?.fullname,
                    email: approver.body?.email,
                },
            },
            $push: {
                activities: activity,
            },
        };
        await Task.updateOne(filter, update);
        return success.ok({
            message: `success`,
        });
    }
    return error.notFound({
        param: "taskId",
        value: params.id,
        location: "param",
        message: `Task ${params.id} does not exist`,
    });
}

export async function deleteManyTasks(params: {
    userRoles: string[];
    tenant: string;
    task_ids: string[];
}): Promise<Result> {
    const response = await findRoleByIds(params.userRoles, params.tenant);
    let isDelete = false;
    if (response.status === HttpStatus.OK) {
        const roles = response.body;
        if (roles && roles.length > 0) {
            roles.map((role) => {
                if (
                    ((role.type.includes(RoleType.DEFAULT) &&
                        (role.id === "L1-REQUEST" ||
                            role.id === "L2-REQUEST")) ||
                        role.type.includes(RoleType.EMPLOYEE)) &&
                    role.task_permission.delete
                ) {
                    isDelete = true;
                }
            });
        }
    }

    if (!isDelete) {
        return error.actionNotAllowed();
    }
    const filter: FilterQuery<ITask> = {
        id: {
            $in: params.task_ids,
        },
        approval_status: {
            $nin: ["REJECT", "APPROVED"],
        },
        is_deleted: false,
    };
    const update = {
        $set: { is_deleted: true },
    };
    const result = await Task.updateMany(filter, update, {
        new: true,
        _id: 0,
    });

    if (result.modifiedCount === 0) {
        throw new HttpError({
            status: HttpStatus.BAD_REQUEST,
            code: "APPROVED_TASK",
            description: {
                en: "Can't delete tasks that approved or rejected",
                vi: "Không thể xóa các task công việc đã được phê duyệt hoặc từ chối",
            },
            errors: [
                {
                    location: "body",
                    param: "task_ids",
                    value: params.task_ids,
                },
            ],
        });
    }
    return success.ok({
        message: `Xóa thành công ${
            result.modifiedCount
        } công việc và không thành công ${
            params.task_ids.length - result.modifiedCount
        } công việc do không có quyền`,
        // deleted: result.modifiedCount,
        // number_of_tasks: params.task_ids.length,
    });
}

export async function deleleTask(params: {
    task_id: string;
    userRoles: string[];
    tenant: string;
}): Promise<Result> {
    const { task_id, userRoles, tenant } = params;
    const response = await findRoleByIds(userRoles, tenant);
    let isDelete = false;
    if (response.status === HttpStatus.OK) {
        const roles = response.body;
        if (roles && roles.length > 0) {
            roles.map((role) => {
                if (
                    ((role.type.includes(RoleType.DEFAULT) &&
                        (role.id === "L1-REQUEST" ||
                            role.id === "L2-REQUEST")) ||
                        role.type.includes(RoleType.EMPLOYEE)) &&
                    role.task_permission.delete
                ) {
                    isDelete = true;
                }
            });
        }
    }
    if (!isDelete) {
        return error.actionNotAllowed();
    }
    await checkApprovalStatus(params.task_id, true);

    const result = await Task.findOneAndUpdate(
        { id: task_id, is_deleted: false },
        { is_deleted: true }
    );
    if (!result) {
        throw new HttpError(
            error.notFound({
                location: "param",
                message: `task not found`,
                param: "id",
                value: `${task_id}`,
            })
        );
    }
    return success.ok({
        message: "success",
    });
}

async function checkApprovalStatus(
    task_id: string,
    is_delete: boolean
): Promise<void> {
    const filter: FilterQuery<ITask> = {
        id: task_id,
        approval_status: {
            $in: ["REJECT", "APPROVED"],
        },
    };
    const task = await Task.findOne(filter);
    if (task) {
        if (is_delete === true) {
            throw new HttpError({
                status: HttpStatus.BAD_REQUEST,
                code: "APPROVED_TASK",
                description: {
                    en: "Can't delete tasks that approved or rejected",
                    vi: "Không thể xóa các task công việc đã được phê duyệt hoặc từ chối",
                },
                errors: [
                    {
                        location: "body",
                        param: "approval_status",
                        value: task.approval_status,
                    },
                ],
            });
        } else {
            throw new HttpError({
                status: HttpStatus.BAD_REQUEST,
                code: "APPROVED_TASK",
                description: {
                    en: "Task has already approved",
                    vi: "Công việc đã được xử lí",
                },
                errors: [
                    {
                        location: "body",
                        param: "approval_status",
                        value: task.approval_status,
                    },
                ],
            });
        }
    }
}

async function checkTaskValid(params: {
    id: string;
    userRoles: string[];
    tenant: string;
}): Promise<void> {
    const task = await getTaskById({
        id: params.id,
    });
    if (
        !(
            task.data.estimated_time &&
            task.data.estimated_time.begin &&
            task.data.estimated_time.end
        )
    ) {
        throw new HttpError({
            status: HttpStatus.BAD_REQUEST,
            code: "INVALID_DATA",
            errors: [
                {
                    param: "estimated time",
                    location: "body",
                    value: "",
                },
            ],
            description: {
                en: "Estimated time can not empty",
                vi: "Thời gian dự kiến không được bỏ trống",
            },
        });
    }
}

async function checkComment(params: {
    approval_status: string;
    comment?: string;
}): Promise<void> {
    if (
        params.approval_status !== "NEED_CLARIFICATION" ||
        (params.approval_status === "NEED_CLARIFICATION" &&
            !isNullOrUndefined(params.comment) &&
            params.comment?.length !== 0)
    ) {
        return;
    }
    throw new HttpError({
        status: HttpStatus.BAD_REQUEST,
        code: "INVALID_DATA",
        errors: [
            {
                param: "comment",
                location: "body",
                value: `${params.comment}`,
            },
        ],
        description: {
            en: "Comment can not empty",
            vi: "Bình luận không được bỏ trống",
        },
    });
}
