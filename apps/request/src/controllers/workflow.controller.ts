import { error, HttpError, Result, success } from "app";
import { FilterQuery, PipelineStage } from "mongoose";
import { parseQuery, parseSort, ParseSyntaxError } from "mquery";
import { IWorkflow, TypeEnum } from "../interfaces/models";
import { Workflow } from "../models";
import { FindReqQuery } from "../interfaces/request";

export async function findWorkflow(params: FindReqQuery): Promise<Result> {
    let filter: FilterQuery<IWorkflow> = {};
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

    const project = {
        _id: 0,
        id: 1,
        name: 1,
        type: 1,
        description: 1,
        created_time: 1,
        is_active: 1,
    };
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
        { $project: project },
        { $facet: facet },
    ];

    console.log("%o", pipeline);
    const result = await Workflow.aggregate(pipeline)
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

export async function getWorkflowById(params: {
    workflowId: string;
    tenant?: string;
}): Promise<Result> {
    const pipeline = workflowDetailPipeline(params);
    const workflows = await Workflow.aggregate(pipeline);
    if (workflows && workflows.length > 0) {
        return success.ok(workflows[0]);
    } else {
        return error.notFound({
            param: "workflowId",
            value: params.workflowId,
            location: "param",
            message: `the workflow ${params.workflowId} does not exist`,
        });
    }
}

export function workflowDetailPipeline(params: {
    workflowId: string;
    tenant?: string;
}): PipelineStage[] {
    const match: FilterQuery<IWorkflow> = {
        id: params.workflowId,
        is_active: true,
    };
    if (params.tenant) {
        match.$or = [{ tenant: params.tenant }, { type: TypeEnum.DEFAULT }];
    }

    const lookup = {
        from: "status",
        let: {
            status_id: "$nodes.status",
        },
        as: "nodes.status",
        pipeline: [
            {
                $match: {
                    $expr: { $eq: ["$$status_id", "$id"] },
                },
            },
            {
                $project: { _id: 0 },
            },
        ],
    };
    const set = {
        "nodes.status": {
            $first: "$nodes.status",
        },
    };
    const group = {
        _id: "$_id",
        id: { $first: "$id" },
        name: { $first: "$name" },
        description: { $first: "$description" },
        created_time: { $first: "$created_time" },
        updated_time: { $first: "$updated_time" },
        updated_by: { $first: "$updated_by" },
        tenant: { $first: "$tenant" },
        edges: { $first: "$edges" },
        nodes: { $push: "$nodes" },
    };
    return [
        { $match: match },
        {
            $unwind: {
                path: "$nodes",
                preserveNullAndEmptyArrays: true,
            },
        },
        { $lookup: lookup },
        { $set: set },
        { $group: group },
        { $project: { _id: 0 } },
    ];
}
