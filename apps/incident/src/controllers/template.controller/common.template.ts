import { FilterQuery, PipelineStage } from "mongoose";
import { ITemplate } from "../../interfaces/models";

export function templateDetailPipeline(params: {
    templateId: string;
    tenant?: string;
}): PipelineStage[] {
    type StageLookup = PipelineStage.Lookup["$lookup"];
    function lookup(type_form: string): StageLookup {
        return {
            from: "fields",
            let: {
                field_id: `$${type_form}.field`,
            },
            as: `${type_form}.field`,
            pipeline: [
                {
                    $match: {
                        $expr: { $eq: ["$$field_id", "$id"] },
                    },
                },
                {
                    $project: { _id: 0 },
                },
            ],
        };
    }

    const group = {
        _id: "$_id",
        id: { $first: "$id" },
        name: { $first: "$name" },
        description: { $first: "$description" },
        workflow: { $first: "$workflow" },
        tenant: { $first: "$tenant" },
        default_name: { $first: "$default_name" },
        default_description: { $first: "$default_description" },
        default_requester: { $first: "$default_requester" },
        created_time: { $first: "$created_time" },
        updated_time: { $first: "$updated_time" },
        created_by: { $first: "$created_by" },
        updated_by: { $first: "$updated_by" },
        has_enduser_layout: { $first: "$has_enduser_layout" },
    };

    const set_tech = {
        "technician_layout.field": {
            $first: "$technician_layout.field",
        },
    };

    const set_end = {
        "enduser_layout.field": {
            $first: "$enduser_layout.field",
        },
    };

    const group_tech = {
        ...group,
        technician_layout: { $push: "$technician_layout" },
        enduser_layout: { $first: "$enduser_layout" },
    };

    const group_end = {
        ...group,
        technician_layout: { $first: "$technician_layout" },
        enduser_layout: { $push: "$enduser_layout" },
    };
    const match: FilterQuery<ITemplate> = {
        id: params.templateId,
        is_active: true,
    };
    if (params.tenant) {
        match.$or = [{ tenant: params.tenant }, { type: "DEFAULT" }];
    }
    return [
        { $match: match },
        {
            $unwind: {
                path: "$technician_layout",
                preserveNullAndEmptyArrays: true,
            },
        },
        { $lookup: lookup("technician_layout") },
        { $set: set_tech },
        { $group: group_tech },
        {
            $unwind: {
                path: "$enduser_layout",
                preserveNullAndEmptyArrays: true,
            },
        },
        { $lookup: lookup("enduser_layout") },
        { $set: set_end },
        { $group: group_end },
        { $project: { _id: 0 } },
    ];
}
