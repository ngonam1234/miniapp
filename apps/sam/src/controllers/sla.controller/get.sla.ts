import { HttpError, Result, error, success } from "app";
import { FilterQuery, PipelineStage } from "mongoose";
import { ParseSyntaxError, parseQuery, parseSort } from "mquery";
import { ISla } from "../../interfaces/model";
import { FindSlaReqQuery } from "../../interfaces/request";
import Sla from "../../model/sla";

export async function findSla(
    params: FindSlaReqQuery & { tenant?: string }
): Promise<Result> {
    let filter: FilterQuery<ISla> = {
        is_deleted: false,
        module: params.module,
    };
    let sort: Record<string, 1 | -1> = { order: 1 };
    params.tenant && (filter.tenant = params.tenant);
    try {
        if (params.query) {
            const uFilter = parseQuery(params.query);
            filter = { $and: [filter, uFilter] };
        }
        params.sort && (sort = parseSort(params.sort));
    } catch (e) {
        const err = e as ParseSyntaxError;
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
        resolving_assurance: 0,
        response_assurance: 0,
        matching_rule: 0,
        is_deleted: 0,
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
        { $match: filter },
        { $project: project },
        { $sort: sort },
        { $facet: facet },
    ];
    const data = await Sla.aggregate(pipeline)
        .collation({ locale: "vi" })
        .then((res) => res[0])
        .then((res) => {
            const total = res.meta.length <= 0 ? 0 : res.meta[0].total;
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

export async function getSlaById(params: {
    slaId: string;
    tenant?: string;
}): Promise<Result> {
    const filter: FilterQuery<ISla> = {
        id: params.slaId,
        is_deleted: false,
    };
    params.tenant && (filter.tenant = params.tenant);
    const sla = await Sla.findOne(filter, { _id: 0, is_deleted: 0 })?.lean();
    if (!sla) {
        return error.notFound({
            location: "param",
            param: "slaId",
            value: params.slaId,
            message: "the sla does not exist",
        });
    }

    const mapper = (c: { field: { name: string } }): unknown => ({
        ...c,
        field: c.field.name,
    });

    const matchingConditions = sla.matching_rule?.conditions.map(mapper);
    const resolvingAssuranceUpdate1 =
        sla.resolving_assurance?.first_level?.update_fields.map(mapper);
    const resolvingAssuranceUpdate2 =
        sla.resolving_assurance?.second_level?.update_fields.map(mapper);
    const resolvingAssuranceUpdate3 =
        sla.resolving_assurance?.third_level?.update_fields.map(mapper);
    const resolvingAssuranceUpdate4 =
        sla.resolving_assurance?.four_level?.update_fields.map(mapper);

    const responseAssuranceUpdate1 =
        sla.response_assurance?.first_level?.update_fields.map(mapper);
    const responseAssuranceUpdate2 =
        sla.response_assurance?.second_level?.update_fields.map(mapper);
    return success.ok({
        ...sla,
        matching_rule: sla.matching_rule && {
            ...sla.matching_rule,
            conditions: matchingConditions,
        },

        resolving_assurance: sla.resolving_assurance && {
            ...sla.resolving_assurance,
            first_level: sla.resolving_assurance.first_level && {
                ...sla.resolving_assurance.first_level,
                update_fields: resolvingAssuranceUpdate1,
            },
            second_level: sla.resolving_assurance.second_level && {
                ...sla.resolving_assurance.second_level,
                update_fields: resolvingAssuranceUpdate2,
            },
            third_level: sla.resolving_assurance.third_level && {
                ...sla.resolving_assurance.third_level,
                update_fields: resolvingAssuranceUpdate3,
            },
            four_level: sla.resolving_assurance.four_level && {
                ...sla.resolving_assurance.four_level,
                update_fields: resolvingAssuranceUpdate4,
            },
        },
        response_assurance: sla.response_assurance && {
            ...sla.response_assurance,
            first_level: sla.response_assurance.first_level && {
                ...sla.response_assurance.first_level,
                update_fields: responseAssuranceUpdate1,
            },
            second_level: sla.response_assurance.second_level && {
                ...sla.response_assurance.second_level,
                update_fields: responseAssuranceUpdate2,
            },
        },
    });
}
