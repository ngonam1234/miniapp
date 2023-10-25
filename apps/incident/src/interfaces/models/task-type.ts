export interface ITaskType {
    id: string;
    tenant: string;
    name: string;
    description?: string;
    is_active: boolean;
    is_deleted: boolean;
    created_time: Date;
    updated_time?: Date;
}
