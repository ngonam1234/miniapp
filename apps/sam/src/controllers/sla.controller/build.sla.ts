import { HttpError, error } from "app";
import { ISla, ISlaLevelEscalation } from "../../interfaces/model";
import {
    CreateSlaReqBody,
    LevelEscalationReqBody,
    UpdateSlaReqBody,
} from "../../interfaces/request";
import { document } from "../../model";

const ticketFields = [
    {
        name: "service",
        location: "service.id",
        display: "Dịch vụ cha",
    },
    {
        name: "sub_service",
        location: "sub_service.id",
        display: "Dịch vụ con",
    },
    {
        name: "category",
        location: "category.id",
        display: "Category",
    },
    {
        name: "sub_category",
        location: "sub_category.id",
        display: "Sub-category",
    },
    {
        name: "type",
        location: "type.id",
        display: "Loại yêu cầu",
    },
    {
        name: "priority",
        location: "priority.id",
        display: "Mức độ ưu tiên",
    },
    {
        name: "impact",
        location: "impact.id",
        display: "Mức độ ảnh hưởng",
    },
    {
        name: "urgency",
        location: "urgency.id",
        display: "Mức độ khẩn cấp",
    },
    {
        name: "group",
        location: "group.id",
        display: "Nhóm hỗ trợ",
    },
    {
        name: "technician",
        location: "technician.id",
        display: "Cán bộ hỗ trợ",
    },
    {
        name: "requester",
        location: "requester.id",
        display: "Người yêu cầu",
    },
];

export function getUpdatingGroup(body: UpdateSlaReqBody): string[] {
    const groups: string[] = [];
    function groupInEscalation(esc?: LevelEscalationReqBody): string[] {
        if (esc && esc.update_fields) {
            const gs = esc.update_fields
                .filter((f) => f.value && f.field === "group")
                .map((f) => f.value as string);
            return [...new Set(gs)];
        } else return [];
    }
    groups.push(...groupInEscalation(body.response_assurance?.first_level));
    groups.push(...groupInEscalation(body.response_assurance?.second_level));
    groups.push(...groupInEscalation(body.resolving_assurance?.first_level));
    groups.push(...groupInEscalation(body.resolving_assurance?.second_level));
    groups.push(...groupInEscalation(body.resolving_assurance?.third_level));
    groups.push(...groupInEscalation(body.resolving_assurance?.four_level));

    return [...new Set(groups)];
}

export function buildMatchingRule(
    sla: document<ISla>,
    rule: CreateSlaReqBody["matching_rule"],
    possibleData: Record<string, string[]>
): void {
    if (!rule) return;
    const setField: Set<string> = new Set();
    const conditions = rule.conditions.map((con, i) => {
        const field = ticketFields.find((f) => f.name === con.field);
        if (!field) {
            throw new HttpError(
                error.invalidData({
                    value: con,
                    location: "body",
                    param: `matching_rule.condition[${i}]`,
                    message: `unknown field ${con.field}`,
                })
            );
        } else {
            if (setField.has(field.name)) {
                throw new HttpError(
                    error.invalidData({
                        value: con,
                        location: "body",
                        param: `matching_rule.condition[${i}]`,
                        message: `field ${con.field} is duplicated`,
                    })
                );
            }
            setField.add(field.name);
            const fieldData = possibleData[field.name];
            const valueIsNotOke = con.values.find(
                (v) => !fieldData.find((d) => d === v)
            );
            if (valueIsNotOke) {
                throw new HttpError(
                    error.invalidData({
                        location: "body",
                        param: `matching_rule.conditions[${i}]`,
                        value: con,
                        message: `the value ${valueIsNotOke} is not valid`,
                    })
                );
            }
            return { field, values: con.values };
        }
    });
    sla.matching_rule = {
        type: rule.type,
        conditions: conditions,
    };
}

export function buildResponseAssurance(
    sla: document<ISla>,
    assurance: CreateSlaReqBody["response_assurance"],
    allPossibleData: Record<string, string[]>,
    groupsMembers: Record<string, string[]>
): void {
    if (!assurance) return;
    sla.response_assurance = {
        determine_by: assurance.determine_by,
        time_limit: assurance.time_limit,
    };
    if (assurance.first_level) {
        const esc = buildLevelEscalation(
            assurance.first_level,
            "response_assurance.first_level",
            allPossibleData,
            groupsMembers
        );
        sla.response_assurance.first_level = esc;
    }
    if (assurance.second_level) {
        const esc = buildLevelEscalation(
            assurance.second_level,
            "response_assurance.second_level",
            allPossibleData,
            groupsMembers
        );
        sla.response_assurance.second_level = esc;
    }
}

export function buildResolvingAssurance(
    sla: document<ISla>,
    assurance: CreateSlaReqBody["resolving_assurance"],
    possibleData: Record<string, string[]>,
    groupsMembers: Record<string, string[]>
): void {
    if (!assurance) return;
    sla.resolving_assurance = {
        time_limit: assurance.time_limit,
    };
    if (assurance.first_level) {
        const esc = buildLevelEscalation(
            assurance.first_level,
            "resolving_assurance.first_level",
            possibleData,
            groupsMembers
        );
        sla.resolving_assurance.first_level = esc;
    }
    if (assurance.second_level) {
        const esc = buildLevelEscalation(
            assurance.second_level,
            "resolving_assurance.second_level",
            possibleData,
            groupsMembers
        );
        sla.resolving_assurance.second_level = esc;
    }
    if (assurance.third_level) {
        const esc = buildLevelEscalation(
            assurance.third_level,
            "resolving_assurance.third_level",
            possibleData,
            groupsMembers
        );
        sla.resolving_assurance.third_level = esc;
    }
    if (assurance.four_level) {
        const esc = buildLevelEscalation(
            assurance.four_level,
            "resolving_assurance.four_level",
            possibleData,
            groupsMembers
        );
        sla.resolving_assurance.four_level = esc;
    }
}

function buildLevelEscalation(
    esc: LevelEscalationReqBody,
    location: string,
    possibleData: Record<string, string[]>,
    groupsMembers: Record<string, string[]>
): ISlaLevelEscalation {
    const fieldGroup = ticketFields.find((t) => t.name === "group");
    const fieldTechnician = ticketFields.find((t) => t.name === "technician");
    const hasOtherField = esc.update_fields.findIndex(
        (u) => u.field !== "group" && u.field !== "technician"
    );
    const groupUpdatings = esc.update_fields.filter((u) => u.field === "group");
    const technicianUpdatings = esc.update_fields.filter(
        (u) => u.field === "technician"
    );
    if (!fieldGroup || !fieldTechnician) {
        throw new HttpError(
            error.invalidData({
                message: "field group or technician is not found",
            })
        );
    }
    if (hasOtherField !== -1) {
        throw new HttpError(
            error.invalidData({
                location: "body",
                param: `${location}.update_fields[${hasOtherField}]`,
                value: esc.update_fields[hasOtherField],
                message: "the field not allow to update",
            })
        );
    }
    if (groupUpdatings.length >= 2) {
        throw new HttpError(
            error.invalidData({
                location: "body",
                value: esc.update_fields,
                param: `${location}.update_fields`,
                message: `field group is duplicated`,
            })
        );
    }
    if (technicianUpdatings.length >= 2) {
        throw new HttpError(
            error.invalidData({
                location: "body",
                value: esc.update_fields,
                param: `${location}.update_fields`,
                message: `field technician is duplicated`,
            })
        );
    }

    const updates: ISlaLevelEscalation["update_fields"] = [];
    if (groupUpdatings.length > 0) {
        const possibleGroup = possibleData["group"];
        const newValue = groupUpdatings[0].value;
        if (newValue && !possibleGroup.includes(newValue)) {
            throw new HttpError(
                error.invalidData({
                    location: "body",
                    value: esc.update_fields,
                    param: `${location}.update_fields`,
                    message: `the value for group is not valid`,
                })
            );
        }
        updates.push({
            field: fieldGroup,
            value: newValue,
        });
    }
    if (technicianUpdatings.length > 0) {
        if (groupUpdatings.length === 0) {
            throw new HttpError(
                error.invalidData({
                    location: "body",
                    value: esc.update_fields,
                    param: `${location}.update_fields`,
                    message: `field technician required field group`,
                })
            );
        }
        const newGroup = groupUpdatings[0].value ?? "";
        const newtechnician = technicianUpdatings[0].value ?? "";
        const possibleTechnician = groupsMembers[newGroup];
        if (newGroup && !possibleTechnician.includes(newtechnician)) {
            throw new HttpError(
                error.invalidData({
                    location: "body",
                    value: esc.update_fields,
                    param: `${location}.update_fields`,
                    message: `the value for technician is not valid`,
                })
            );
        }
        updates.push({
            field: fieldTechnician,
            value: technicianUpdatings[0].value,
        });
    }

    for (let i = 0; i < esc.notify_to.length; i++) {
        const element = esc.notify_to[i];
        let fieldData = [];
        switch (element.type) {
            case "PEOPLE": {
                fieldData = possibleData["requester"];
                break;
            }
            case "GROUP": {
                fieldData = possibleData["group"];
                break;
            }
            default: {
                throw new Error("invalid type");
            }
        }
        const valueIsNotOke = !fieldData.find((d) => d === element.recipient);

        if (valueIsNotOke) {
            throw new HttpError(
                error.invalidData({
                    location: "body",
                    param: `${location}.notify_to[${i}]`,
                    value: element,
                    message: `the recipient ${element.recipient} is not valid`,
                })
            );
        }
    }
    return {
        type: esc.type,
        amount_time: esc.amount_time,
        notify_to: esc.notify_to,
        update_fields: updates,
    };
}
