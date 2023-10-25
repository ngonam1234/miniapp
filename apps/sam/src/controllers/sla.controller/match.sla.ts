import { Result, error } from "app";
import { resolveValue } from "utils";
import { ISla } from "../../interfaces/model";
import Sla from "../../model/sla";
import { calculateSlaForTicket } from "./calculate.sla";

export async function findMatchingSlaForTicket(
    ticket: {
        id: string;
        tenant: string;
        created_time: string;
    },
    module: string
): Promise<Result> {
    const tenant = ticket.tenant;
    const slas: ISla[] = await Sla.aggregate([
        {
            $match: {
                tenant,
                module,
                is_active: true,
                is_deleted: false,
            },
        },
        { $project: { _id: 0 } },
        { $sort: { order: 1 } },
    ]);
    let matchedSla: ISla | undefined = undefined;
    for (const sla of slas) {
        if (checkIfSlaMatch(sla, ticket)) {
            matchedSla = sla;
            break;
        }
    }
    if (matchedSla === undefined) {
        return error.notFound({
            location: "body",
            message: "can not find sla matches with ticket",
        });
    } else {
        const result = calculateSlaForTicket(
            {
                ...ticket,
                sla: matchedSla,
            },
            true
        );
        return result;
    }
}

function checkIfSlaMatch(sla: ISla, ticket: object): boolean {
    let someConditionPassed = false;
    let allConditionPassed = true;
    const rule = sla.matching_rule;
    if (!rule) return false;
    for (const condition of rule.conditions) {
        const location = condition.field.location;
        const actualValue = String(resolveValue(ticket, location));
        if (!condition.values.includes(actualValue)) {
            allConditionPassed = false;
        } else {
            someConditionPassed = true;
        }
        if (rule.type === "OR" && someConditionPassed) {
            return true;
        }
    }
    return allConditionPassed;
}
