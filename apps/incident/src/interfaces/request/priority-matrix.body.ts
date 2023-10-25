export interface CreatePriorityMatrixReqBody {
    urgency: string;
    priority: string;
    impact: string;
}
export interface DeletePriorityMatrixReqBody {
    urgency: string;
    priority: string;
    impact: string;
}

export interface FindPriorityMatrixReqQuery {
    tenant?: string;
}
export interface LevelResBody {
    id?: string;
    name?: string;
}

export interface PriorityMatrixResBody {
    id: string;
    tenant: string;
    urgency?: LevelResBody;
    impact_priority_list: ImpactNPriorityResBody[];
    is_deleted?: boolean;
}
export interface ImpactNPriorityResBody {
    impact: LevelResBody;
    priority?: LevelResBody;
    created_by?: string;
    created_time?: Date;
}
