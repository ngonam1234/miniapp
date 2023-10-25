export interface IDepartment {
    id: string;
    name: string;
    description?: string;
    manager?: string;
    approver?: string;
    pic?: string;
    tenant: string;
    sub_departments: ISubDepartment[];
    is_active: boolean;
    is_deleted: boolean;
    updated_time?: Date;
    updated_by?: string;
    created_time: Date;
    members?: string[];
}
export interface ISubDepartment {
    id: string;
    name: string;
    description?: string | null;
    is_active: boolean;
    is_deleted: boolean;
}
