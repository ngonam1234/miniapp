import { ISubDepartment } from "../models";

export interface CreatedDepartmentReqbody {
    name: string;
    tenant: string;
    description?: string;
    manager?: string;
    approver?: string;
    members?: string[];
    pic?: string;
    sub_departments?: ISubDepartment[];
    is_active: boolean;
}
export interface GetDepartmentsReqBody {
    size: number;
    page: number;
    tenant: string;
    is_active: string;
    is_deleted: string;
}
export interface UpdateDepartmentsReqBody {
    name: string;
    tenant: string;
    description?: string;
    manager?: string;
    approver?: string;
    pic?: string;
    sub_departments: ISubDepartment[];
    is_active: boolean;
    members?: string[];
}

export interface AddRelationshipReqbody {
    tenant: string;
    parent: string;
    sub_department: ISubDepartment[];
}

export interface RemoveRelationship {
    tenant: string;
    department: string;
    child_department: string;
}
export interface DeleteDepartmentReqBody {
    department_ids: string[];
}

export type ImportDepartmentReqBody = CreatedDepartmentReqbody[];
