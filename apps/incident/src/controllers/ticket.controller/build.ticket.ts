import { error, HttpError } from "app";
import { isNumeric } from "utils";
import {
    ETicketAction,
    IDefaultField,
    ILayoutItemDetail,
    IPeople,
    ITicket,
} from "../../interfaces/models";
import { document } from "../../models";
import { ticketHasDefaultField } from "./common.ticket";
import { getPossibleFieldData } from "./field.ticket";
import logger from "logger";
import { getPriorityByImpactAndUrgency } from "../priority-matrix.controller";

export async function buildTicketDocument(
    ticket: document<ITicket>,
    fields: { [key: string]: string },
    isEndUser: boolean,
    creator: IPeople,
    is_create: boolean,
    note?: string
): Promise<void> {
    const now = new Date();
    ticket.activities.length === 0
        ? ticket.activities.push({
              action: ETicketAction.CREATE,
              actor: creator,
              time: now,
          })
        : ticket.activities.push({
              action: ETicketAction.UPDATE,
              note: note,
              actor: creator,
              time: now,
              updates: [],
          });
    const layout: ILayoutItemDetail[] = isEndUser
        ? ticket.template.enduser_layout
        : ticket.template.technician_layout;
    const unknownFieldError = (name: string, value: string): HttpError =>
        new HttpError(
            error.invalidData({
                location: "body",
                param: `fields.${name}`,
                value: value,
                message: `the field ${name} is unknown`,
            })
        );
    const possibleFieldData = await getPossibleFieldData(ticket, fields);
    if (fields.urgency && fields.impact) {
        const getPriority = await getPriorityByImpactAndUrgency({
            impact: fields.impact as unknown as string,
            urgency: fields.urgency as unknown as string,
            tenant: ticket.tenant,
        });
        if (getPriority.length > 0) {
            ticket.priority = {
                id: getPriority[0].id,
                name: getPriority[0].name,
            };
        }
    }
    const fieldNames = Object.keys(fields);
    for (let i = 0; i < fieldNames.length; i++) {
        const fieldName = fieldNames[i];
        const fieldValue = fields[fieldName];
        const layoutItem = layout.find((item) => item.field.name === fieldName);
        if (!layoutItem || !ticketHasDefaultField(fieldName)) {
            throw unknownFieldError(fieldName, fieldValue);
        }
        if (layoutItem.field.type === "CUSTOM") {
            buildCustomTicketFields();
        } else {
            buildDefaultTicketFields(
                ticket,
                fieldName,
                fieldValue,
                possibleFieldData,
                layoutItem
            );
        }
    }
    if (is_create === true) {
        for (let i = 0; i < layout.length; i++) {
            const layoutItem = layout[i];
            const itemName = layoutItem.field.name;
            const fieldKey = <keyof ITicket>itemName;
            if (layoutItem.required === true) {
                const requiredField = ticket[fieldKey];
                if (!requiredField) {
                    throw new HttpError(
                        error.invalidData({
                            location: "body",
                            param: `fields`,
                            value: fields,
                            message: `the field ${itemName} is required`,
                        })
                    );
                }
            }
        }
    }
}

function buildCustomTicketFields(): void {
    // build custom field for ticket here
}

function buildDefaultTicketFields(
    ticket: document<ITicket>,
    inputField: keyof ITicket,
    inputValue: string,
    possibleFieldData: Awaited<ReturnType<typeof getPossibleFieldData>>,
    layoutItem: ILayoutItemDetail
): void {
    const isUpdating = ticket.activities.length > 1;
    const updates = ticket.activities.at(-1)?.updates;
    if (!updates) throw new Error("updates is undefined");
    const invalidValueError = new HttpError(
        error.invalidData({
            location: "body",
            param: `fields.${String(inputField)}`,
            value: inputValue,
            message: `the value of field ${String(inputField)} is invalid`,
        })
    );

    switch (layoutItem.field.input_type) {
        case "COMBO_BOX": {
            const possibleDataOfField = possibleFieldData.find(
                (f) => f.field === inputField
            );
            let actualData = undefined;
            if (inputValue !== "") {
                actualData = possibleDataOfField?.data.find(
                    (f) => f.id === inputValue
                );
            }
            if (inputValue && !actualData) {
                throw invalidValueError;
            }
            type fieldKey = Extract<ITicket, typeof inputField>;
            if (inputField === "status" && ticket.status?.id !== inputValue) {
                // hard code here
                const timeNow = new Date();
                const statusId = (<IDefaultField>actualData).id;
                if (statusId === "89e27354-ad11-11ed-afa1-0242ac120002") {
                    ticket.closed_time = timeNow;
                }
                if (statusId === "89e271b0-ad11-11ed-afa1-0242ac120002") {
                    ticket.resolved_time = timeNow;
                }
            }
            if (isUpdating && ticket[inputField]?.id !== actualData?.id) {
                updates.push({
                    field: {
                        name: layoutItem.field.name,
                        display: layoutItem.field.title,
                    },
                    old: ticket[inputField],
                    new: actualData,
                });
            }
            ticket[inputField] = <ITicket[fieldKey]>actualData;
            break;
        }
        case "DATE_TIME": {
            if (!inputValue[isNumeric]() && inputValue !== "") {
                throw invalidValueError;
            }
            let value: Date | undefined = undefined;
            if (inputValue !== "") {
                value = new Date(Number(inputValue) * 1000);
            }

            type fieldKey = Extract<ITicket, typeof inputField>;
            if (
                isUpdating &&
                ticket[inputField]?.getTime() !== value?.getTime()
            ) {
                updates.push({
                    field: {
                        name: layoutItem.field.name,
                        display: layoutItem.field.title,
                    },
                    old: ticket[inputField],
                    new: value,
                });
            }
            ticket[inputField] = <ITicket[fieldKey]>value;
            break;
        }
        default: {
            throw new Error("invalid input type");
        }
    }
}
