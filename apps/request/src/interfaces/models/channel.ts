import { TypeEnum } from "./request.enum";

export interface IChannel {
    id: string;
    name: string;
    description: string;
    type: TypeEnum;
    created_time: Date;
    is_active: boolean;
    is_deleted: boolean;
    tenant?: string;
    updated_by?: string;
    updated_time?: Date;
}
