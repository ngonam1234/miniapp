import { HttpError, Result, error, success } from "app";
import { Field } from "../../models";
import {
    getDefaultStatus,
    getPossibleCategories,
    getPossibleChannels,
    getPossibleGroups,
    getPossibleServices,
    getPossibleSubCategories,
    getPossibleTechnicians,
    getPossibleTypes,
    getPossibleUrgencies,
} from "../common.controller";
import { getPossibleSubServices } from "../common.controller";

export async function getTemplateFieldData(params: {
    fieldId: string;
    userTenant?: string;
    dependencies: {
        [key: string]: string;
    };
}): Promise<Result> {
    const field = await Field.findOne({ id: params.fieldId });
    if (!field) {
        throw new HttpError(
            error.notFound({
                location: "params",
                param: "fieldId",
                value: params.fieldId,
                message: "the field does not exist",
            })
        );
    }
    switch (field.name) {
        case "status": {
            const workflow = params.dependencies["workflow"];
            if (!workflow) return success.ok([]);
            const data = await getDefaultStatus(workflow, params.userTenant);
            return success.ok(data);
        }
        case "service": {
            const data = await getPossibleServices(params.userTenant);
            return success.ok(data);
        }
        case "sub_service": {
            const service = params.dependencies["service"];
            if (!service) return success.ok([]);
            const data = await getPossibleSubServices(
                service,
                params.userTenant
            );
            return success.ok(data);
        }
        case "category": {
            const service = params.dependencies["service"];
            if (!service) return success.ok([]);
            const data = await getPossibleCategories(
                service,
                params.userTenant
            );
            return success.ok(data);
        }
        case "sub_category": {
            const category = params.dependencies["category"];
            if (!category) return success.ok([]);
            const data = await getPossibleSubCategories(
                category,
                params.userTenant
            );
            return success.ok(data);
        }
        case "group": {
            const data = await getPossibleGroups(params.userTenant);
            return success.ok(data);
        }
        case "technician": {
            const group = params.dependencies["group"];
            if (!group) return success.ok([]);
            const data = await getPossibleTechnicians(group, params.userTenant);
            return success.ok(data);
        }
        case "type": {
            const data = await getPossibleTypes(params.userTenant);
            return success.ok(data);
        }
        // case "priority": {
        //     const data = await getPossiblePriorities(params.userTenant);
        //     return success.ok(data);
        // }
        case "channel": {
            const data = await getPossibleChannels(params.userTenant);
            return success.ok(data);
        }
        default: {
            throw new HttpError(
                error.invalidData({
                    message: "the field is not supported",
                    value: field.name,
                })
            );
        }
    }
}