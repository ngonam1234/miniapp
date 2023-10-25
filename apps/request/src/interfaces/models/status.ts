import { TypeEnum } from "./request.enum";

export interface IStatus {
    id: string;
    name: string;
    description: string;
    type: TypeEnum;
    count_time: boolean;
    created_time: Date;
    is_active: boolean;
    is_deleted: boolean;
    tenant?: string;
}
