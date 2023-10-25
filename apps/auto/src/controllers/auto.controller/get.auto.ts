import { ParseSyntaxError, parseQuery, parseSort } from "mquery";

import { FilterQuery, PipelineStage } from "mongoose";
import { FindReqQuery } from "../../interfaces/request";
import { HttpError, Result, error, success } from "app";
import { IAuto } from "../../interfaces/model";
import Auto from "../../models/auto.model";
import logger from "logger";
import { getUserByIds } from "../../services/user.service";

export async function findAuto(params: FindReqQuery): Promise<Result> {
    let filter: FilterQuery<IAuto> = {
        is_delete: false,
        type: params.type,
    };
    let sort: Record<string, 1 | -1> = { priority: 1 };
    params.tenant && (filter.tenant = params.tenant);
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
        description: 1,
        tenant: 1,
        auto_type: 1,
        created_time: 1,
        is_active: 1,
        priority: 1,
        type: 1,
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
    Object.assign(filter, { is_delete: false });
    const pipeline: PipelineStage[] = [
        { $match: filter },
        { $project: project },
        { $sort: sort },
        { $facet: facet },
    ];
    const data = await Auto.aggregate(pipeline)
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
    return success.ok(data);
}

export async function getAutoById(params: {
    autoId: string;
    userTenant?: string;
}): Promise<Result> {
    const filter: FilterQuery<IAuto> = {
        id: params.autoId,
        is_delete: false,
    };
    params.userTenant && (filter.tenant = params.userTenant);
    const auto = await Auto.findOne(filter, { _id: 0, is_delete: 0 })?.lean();
    if (!auto) {
        return error.notFound({
            location: "param",
            param: "autoId",
            value: params.autoId,
            message: "the auto does not exist",
        });
    }
    const mapper = (c: { field: { name: string } }): unknown => ({
        ...c,
        field: c.field.name,
    });
    const matchingConditions = auto?.conditions.map(mapper);
    const group = auto.group.id;
    if (auto.updated_by) {
        const updated_by = await getUserByIds([auto?.updated_by as unknown as string])
        Object.assign(auto, { updated_by: updated_by.body![0].email })
    }
    return success.ok({
        ...auto,
        conditions: matchingConditions,
        group: group,
    });
}
