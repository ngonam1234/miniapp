import { IPeople } from "./ticket";

export interface IStatus {
    id: string;
    name: string;
    description: string;
    type: "DEFAULT" | "CUSTOM";
    count_time: boolean;
    created_time: Date;
    created_by?: IPeople;
    updated_time?: Date;
    updated_by?: IPeople;
    is_active: boolean;
    is_deleted: boolean;
    tenant?: string;
}
