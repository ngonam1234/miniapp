export interface CreateSlaReqBody {
    name: string;
    description?: string;
    is_active?: boolean;
    working_time: "8x5" | "24x7" | "24x5";
    include_holiday?: boolean;

    matching_rule?: {
        type: "AND" | "OR";
        conditions: {
            field: string;
            values: string[];
        }[];
    };
    response_assurance?: {
        determine_by: "CHANGE_STATUS" | "FIRST_RESPONSE";
        time_limit: number;
        first_level?: LevelEscalationReqBody;
        second_level?: LevelEscalationReqBody;
    };
    resolving_assurance?: {
        time_limit: number;
        first_level?: LevelEscalationReqBody;
        second_level?: LevelEscalationReqBody;
        third_level?: LevelEscalationReqBody;
        four_level?: LevelEscalationReqBody;
    };
}

export interface LevelEscalationReqBody {
    type: "BEFORE_OVERDUE" | "AFTER_OVERDUE";
    amount_time: number;

    notify_to: {
        type: "PEOPLE" | "GROUP";
        recipient: string;
    }[];

    update_fields: {
        field: string;
        value?: string;
    }[];
}

export interface SlaOrderItem {
    id: string;
    order: number;
}

export type UpdateSlaReqBody = Partial<CreateSlaReqBody>;
export type UpdateSlaOrderReqBody = SlaOrderItem[];
