import { UserResBody } from ".";
import { ISubDepartment } from "../models";

export interface DepartmentResBody {
    id: string;
    name: string;
    description?: string;
    manager?: UserResBody;
    approver?: UserResBody | undefined;
    pic?: UserResBody;
    tenant: string;
    sub_departments: ISubDepartment[];
    is_active: boolean;
    numberOfMembers?: number;
}
