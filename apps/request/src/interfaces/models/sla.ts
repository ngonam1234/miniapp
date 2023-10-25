export interface ISla {
    id: string;
    name: string;
    description?: string;
    is_active: boolean;

    working_time: "8x5" | "24x7" | "24x5";
    include_holiday: boolean;

    // respones level assurance
    response_assurance?: {
        determine_by: "CHANGE_STATUS" | "FIRST_RESPONSE";
        time_limit: number;
        overdue_time?: Date;
        is_overdue: boolean;
        actual_time?: Date;
        first_level?: ISlaLevelEscalation;
        second_level?: ISlaLevelEscalation;
    };

    // respones level assurance
    resolving_assurance?: {
        time_limit: number;
        overdue_time?: Date;
        is_overdue: boolean;
        actual_time?: Date;
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
