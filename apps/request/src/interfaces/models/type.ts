import { TypeEnum } from "./request.enum";

export interface IType {
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
