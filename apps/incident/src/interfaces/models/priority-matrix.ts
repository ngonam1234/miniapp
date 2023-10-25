export interface IImpactNPriority {
    impact: string;
    priority?: string;
    created_by?: string;
    created_time?: Date;
}

export interface IPriorityMatrix {
    id: string;
    tenant: string;
    urgency: string;
    impact_priority_list: IImpactNPriority[];
    is_deleted?: boolean;
}
