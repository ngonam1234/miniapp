export interface CreateAutoReqBody {
    name: string;
    description?: string;
    is_active?: boolean;
    apply_time: IApplyTime;
    apply_request: string[];
    auto_type: "ROUND_ROBIN" | "LOAD_BALANCING";
    is_apply: boolean;
    apply_tech: IApplyTech;
    module: string[];
    group: string;
    conditions: {
        field: string;
        values: string[];
    }[];
}

interface IApplyTime {
    type: "ALL_TIME" | "IN_WORK" | "OUT_WORK";
    time?: "8x5" | "24x7" | "24x5";
}
interface IApplyTech {
    type: "ALL" | "EXCEPT" | "ONLINE" | "ONLY";
    techs?: string[];
}

export interface AutoPriority {
    id: string;
    priority: number;
}

export type UpdateAutoReqBody = Partial<CreateAutoReqBody>;

export type UpdateAutoPriorityReqBody = AutoPriority[];
