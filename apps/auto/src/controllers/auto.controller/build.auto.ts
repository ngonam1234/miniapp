import { HttpError, error } from "app";
import { IAuto } from "../../interfaces/model";
import { CreateAutoReqBody } from "../../interfaces/request";
import { document } from "../../models";
import logger from "logger";

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
        name: "sub_services_L2",
        location: "sub_services_L2.id",
        display: "Dịch vụ cấp 3",
    },
    {
        name: "department",
        location: "requester.department.id",
        display: "Phòng ban",
    },
];

export function buildMatchingRule(
    auto: document<IAuto>,
    rule: NonNullable<CreateAutoReqBody["conditions"]>,
    possibleData: Record<string, string[]>
): void {
    const setField: Set<string> = new Set();
    const conditions = rule.map((con, i) => {
        const field = ticketFields.find((f) => f.name === con.field);
        if (!field) {
            throw new HttpError(
                error.invalidData({
                    value: con,
                    location: "body",
                    param: `condition[${i}]`,
                    message: `unknown field ${con.field}`,
                })
            );
        } else {
            if (setField.has(field.name)) {
                throw new HttpError(
                    error.invalidData({
                        value: con,
                        location: "body",
                        param: `condition[${i}]`,
                        message: `field ${con.field} is duplicated`,
                    })
                );
            }
            setField.add(field.name);
            const fieldData = possibleData[field.name];
            logger.info("---> %o", fieldData);
            const valueIsNotOke = con.values.find(
                (v) => !fieldData.find((d) => d === v)
            );
            if (valueIsNotOke) {
                throw new HttpError(
                    error.invalidData({
                        location: "body",
                        param: `conditions[${i}]`,
                        value: con,
                        message: `the value ${valueIsNotOke} is not valid`,
                    })
                );
            }
            return { field, values: con.values };
        }
    });
    auto.conditions = conditions;
}
