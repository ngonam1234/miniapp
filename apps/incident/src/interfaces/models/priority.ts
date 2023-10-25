import { IPeople } from "./ticket";

export interface IPriority {
    id: string;
    name: string;
    description: string;
    type: "DEFAULT" | "CUSTOM";
    created_time: Date;
    created_by?: IPeople;
    updated_time?: Date;
    updated_by?: IPeople;
    is_active: boolean;
    is_deleted: boolean;
    tenant?: string;
}
