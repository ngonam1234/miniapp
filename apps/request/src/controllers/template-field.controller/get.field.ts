import { HttpError, Result, error, success } from "app";
import { FindReqQuery } from "../../interfaces/request";
import { FilterQuery, PipelineStage } from "mongoose";
import { IField } from "../../interfaces/models";
import { ParseSyntaxError, parseQuery, parseSort } from "mquery";
import { Field } from "../../models";
import { parse } from "utils";

export async function findTemplateField(
    params: FindReqQuery & {
        userTenant?: string;
    }
): Promise<Result> {
    let filter: FilterQuery<IField> = {};
    let sort: Record<string, 1 | -1> = { _id: 1 };
    if (params.userTenant) {
        filter = { $or: [], is_active: true };
        filter.$or?.push({ tenant: params.userTenant });
        filter.$or?.push({ type: "DEFAULT" });
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
        created_by: 0,
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
    const pipeline: PipelineStage[] = [
        { $project: project },
        { $match: filter },
        { $sort: sort },
        { $facet: facet },
    ];
    const data = await Field.aggregate(pipeline)
        .collation({ locale: "vi" })
        .then((res) => res[0])
        .then((res) => {
            const total = !(res.meta.length > 0) ? 0 : res.meta[0].total;
            let totalPage = Math.ceil(total / params.size);
            totalPage = totalPage > 0 ? totalPage : 1;
            for (const i of res.data) {
                const datasource = i.datasource;
                if (datasource) {
                    if (i.name === "status") {
                        datasource.dependencies.push("workflow");
                    }
                    const href = datasource.href;
                    let link = `${href.split("${id}")[0]}\${id}/data`;
                    const length = datasource.dependencies.length;
                    length && (link = `${link}/?`);

                    for (let i = 0; i < length; i++) {
                        const dependency = datasource.dependencies[i];
                        const query = `${dependency}=:${dependency}`;
                        link = i ? `${link}&${query}` : `${link}${query}`;
                    }
                    datasource.href = link[parse]({
                        resource: "template-fields",
                        id: i.id,
                    });
                }
            }
            return {
                page: Number(params.page),
                total: total,
                total_page: totalPage,
                data: res.data,
            };
        });
    return success.ok(data);
}
