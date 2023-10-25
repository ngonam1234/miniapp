export interface GetTenantResBody {
    id: string;
    code: string;
    name?: string;
    description?: string;
    webconsent_url?: string;
    is_active: boolean;
}
export interface GetDepartmentResBody {
    id: string;
    name: string;
    manager?: string;
    approver?: string;
    pic?: string;
    is_active: boolean;
    is_deleted: boolean;
}
