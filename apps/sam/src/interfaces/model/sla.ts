export interface ISla {
    id: string; // id of configuration
    module: "REQUEST" | "INCIDENT";
    name: string;
    description?: string;
    tenant: string; // tenant's code that this configuration belongs to
    order: number;
    is_active: boolean;
    is_deleted: boolean;

    working_time: "8x5" | "24x7" | "24x5"; // manage working time ??
    include_holiday: boolean;

    // matching rule is used to detect which (ticket) is applied
    matching_rule?: {
        type: "AND" | "OR"; // type for list condition
        conditions: ISlaMatchingCondition[]; // list of condition
    };

    // respones level assurance
    response_assurance?: {
        determine_by: "CHANGE_STATUS" | "FIRST_RESPONSE";
        time_limit: number;
        first_level?: ISlaLevelEscalation;
        second_level?: ISlaLevelEscalation;
    };

    // respones level assurance
    resolving_assurance?: {
        time_limit: number;
        first_level?: ISlaLevelEscalation;
        second_level?: ISlaLevelEscalation;
        third_level?: ISlaLevelEscalation;
        four_level?: ISlaLevelEscalation;
    };

    // <<common>> ?
    created_time: Date;
    updated_time?: Date;
    created_by: string; // id of actor
    updated_by?: string; // id of actor
    // <<common>>
}

export interface ISlaLevelEscalation {
    type: "BEFORE_OVERDUE" | "AFTER_OVERDUE";
    amount_time: number; // in minute

    // list entiy notify to when ticket is escalated
    notify_to: ISlaNotificationRecipient[];

    // list field update when ticket is escalated
    update_fields: ISlaUpdatingField[];
}

export interface ISlaUpdatingField {
    field: ITicketField; // infomation of field
    value?: string; // new value of field
}

export interface ISlaNotificationRecipient {
    type: "PEOPLE" | "GROUP";
    recipient: string; // the recipient's id
}

export interface ISlaMatchingCondition {
    field: ITicketField; // infomation of ticket's field
    values: string[]; // list possible value for this field
}

export interface ITicketField {
    name: string; // ex: group, techican
    display: string; // the display name of field
    location: string; // location of field's value

    // where get data when show combox
    datasource?: {
        href: string; // the api's url to get data
        dependencies: ITicketField[]; // ex: value of field technician depend on field group
    };
}
