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
import { ITaskType } from "../interfaces/models/task-type";
import TaskType from "../models/task-type";
import { getUserById } from "../service";
import { UpdateTaskTypeBody } from "../interfaces/request";

export async function getTaskTypes(params: {
    userId: string;
    userRoles: string[];
    userTenant?: string;
    query?: string;
    sort?: string;
    size: number;
    page: number;
}): Promise<Result> {
    const pipeline: PipelineStage[] = [];

    let filter: FilterQuery<ITaskType> = { is_deleted: false };
    params.userTenant && (filter.tenant = params.userTenant);

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

    const res = await TaskType.aggregate(pipeline)
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
}

export async function createTaskType(params: {
    tenant: string;
    name: string;
    description?: string;
    is_active: boolean;
}): Promise<Result> {
    await checkTaskTypeExists({
        tenant: params.tenant,
        name: params.name,
    });
    const task_type = new TaskType({
        id: v1(),
        tenant: params.tenant,
        name: params.name,
        description: params.description,
        is_active: params.is_active,
        created_time: new Date(),
    });
    await task_type.save();
    const data = {
        ...task_type.toJSON(),
        _id: undefined,
    };
    return success.created(data);
}
export async function getTaskTypeById(params: {
    id: string;
    userTenant?: string;
    userRoles: string[];
}): Promise<ResultSuccess> {
    const match: FilterQuery<ITaskType> = {
        id: params.id,
        is_deleted: false,
    };
    if (!params.userRoles.includes("SA")) {
        match.$or = [
            { tenant: params.userTenant },
        ] as FilterQuery<ITaskType>["$or"];
    }
    const task_type = await TaskType.findOne(match, { _id: 0 });
    if (!task_type) {
        throw new HttpError(
            error.notFound({
                message: `taskType ${params.id} not found`,
            })
        );
    }
    const data = { ...task_type.toJSON(), _id: undefined };
    return success.ok(data);
}
export async function updateTaskType(
    params: UpdateTaskTypeBody & {
        userId: string;
        userRoles: string[];
        userTenant?: string;
        taskTypeId: string;
    }
): Promise<Result> {
    const task_type = await TaskType.findOne({
        id: params.taskTypeId,
        is_deleted: false,
    });
    if (task_type) {
        await checkTaskTypeExists({
            task_type_id: params.taskTypeId,
            tenant: task_type.tenant,
            name: params.name,
        });
    }
    const errorMsg = error.invalidData({
        location: "param",
        param: "tastId",
        message: `TaskType id ${params.taskTypeId} doesn't exist`,
        value: params.taskTypeId,
    });
    const match: FilterQuery<ITaskType> = {
        id: params.taskTypeId,
        is_deleted: false,
    };
    if (!params.userRoles.includes("SA")) {
        match.tenant = params.userTenant;
    }
    if (!match) {
        throw new HttpError(errorMsg);
    }
    const updated_by = await getUserById(params.userId);
    if (updated_by.status !== HttpStatus.OK) {
        return error.service(updated_by.url);
    }
    const result = await TaskType.findOneAndUpdate(
        match,
        {
            $set: {
                name: params.name,
                description: params.description,
                is_active: params.is_active,
                updated_by: updated_by.body?.fullname,
                updated_time: new Date(),
            },
        },
        { new: true }
    );

    if (!result) {
        throw new HttpError(errorMsg);
    } else {
        const data = {
            ...result?.toJSON(),
            _id: undefined,
        };
        return success.ok(data);
    }
}

export async function deleteTaskType(params: {
    id: string;
    userRoles: string[];
    userTenant?: string;
}): Promise<Result | Error> {
    const filter: FilterQuery<ITaskType> = {
        id: params.id,
        is_deleted: false,
    };
    if (!params.userRoles.includes("SA")) {
        filter.tenant = params.userTenant;
    }
    const update = {
        $set: { is_deleted: true },
    };
    const result = await TaskType.updateOne(filter, update, {
        new: true,
        _id: 0,
    });
    if (result.modifiedCount === 1) {
        return success.ok({ deleted: result.modifiedCount });
    }
    return error.notFound({
        location: "body",
        param: "id",
        value: params.id,
        message: `taskType ${params.id} doesn't exist`,
    });
}
async function checkTaskTypeExists(params: {
    name: string;
    task_type_id?: string;
    tenant?: string;
}): Promise<void> {
    const match: FilterQuery<ITaskType> = {
        name: {
            $regex: `^${params.name}$`,
            $options: "i",
        },
        is_deleted: false,
    };
    params.tenant ? (match.tenant = params.tenant) : null;
    const response = await TaskType.findOne(match);
    if (response) {
        if (params.task_type_id === response.id) {
            return;
        }
        throw new HttpError({
            status: HttpStatus.BAD_REQUEST,
            code: "INVALID_DATA",
            description: {
                en: "TaskType name already exists",
                vi: "Tên loại công việc đã tồn tại",
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
export async function deleteManyTaskTypes(params: {
    ids: string[];
    userRoles: string[];
    userTenant?: string;
}): Promise<Result | Error> {
    const filter: FilterQuery<ITaskType> = {
        id: {
            $in: params.ids,
        },
        is_deleted: false,
    };
    if (!params.userRoles.includes("SA")) {
        filter.tenant = params.userTenant;
    }
    const update = {
        $set: { is_deleted: true },
    };
    const result = await TaskType.updateMany(filter, update, {
        new: true,
        _id: 0,
    });
    if (result.matchedCount === 0) {
        throw new HttpError({
            status: HttpStatus.NOT_FOUND,
            code: "NOT_FOUND",
            description: {
                en: "Task type not found",
                vi: "Loại công việc không tồn tại",
            },
        });
    }
    return success.ok({
        deleted: result.matchedCount,
        number_of_tasks: params.ids.length,
    });
}
