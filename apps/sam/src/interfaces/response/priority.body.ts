export interface PrioritysResBody {
    id: string;
    name: string;
    description: string;
    type: "DEFAULT" | "CUSTOM";
    created_time: Date;
    is_active: boolean;
    tenant?: string;
}

export type GetPriorityResBody = PrioritysResBody[];
