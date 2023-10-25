export interface ImpactResBody {
    id: string;
    name: string;
    description: string;
    type: "DEFAULT" | "CUSTOM";
    created_time: Date;
    is_active: boolean;
    tenant?: string;
}

export type GetImpactResBody = ImpactResBody[];
