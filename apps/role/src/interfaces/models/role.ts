interface IPeople {
    id: string;
    fullname: string;
    email: string;
    department: string;
    position: string;
    phone: string;
    is_active: boolean;
}

export interface IRole {
    id: string;
    name: string;
    type: "DEFAULT" | "EMPLOYEE" | "CUSTOMER";
    description?: string;
    tenant?: string;
    total_user?: number;
    created_time: Date;
    updated_time?: Date;
    created_by: IPeople;
    updated_by?: IPeople;
    is_active: boolean;
    is_deleted: boolean;
    request_permission: IRequestPermission;
    incident_permission: IIncidentPermission;
    solution_permission: ISolutionPermission;
    advanced_view_permission: IAdvancedViewPermission;
    task_permission: ITaskPermission;
}

export interface IRequestPermission {
    all?: boolean;
    view: boolean;
    view_only_requester?: boolean;
    add: boolean;
    edit: boolean;
    edit_priority: boolean;
    edit_impact: boolean;
    edit_urgency: boolean;
    edit_due_date: boolean;
    edit_due_date_SLA: boolean;
    edit_requester: boolean;
    change_status_to_resolved: boolean;
    change_status_to_closed: boolean;
    change_status_to_cancelled: boolean;
}

export interface IIncidentPermission {
    all?: boolean;
    view: boolean;
    add: boolean;
    edit: boolean;
    edit_priority: boolean;
    edit_impact: boolean;
    edit_urgency: boolean;
    edit_due_date: boolean;
    edit_due_date_SLA: boolean;
    edit_requester: boolean;
    change_status_to_resolved: boolean;
    change_status_to_closed: boolean;
    change_status_to_cancelled: boolean;
}

export interface ISolutionPermission {
    all?: boolean;
    view: boolean;
    add: boolean;
    edit: boolean;
    approve: boolean;
}

export interface IAdvancedViewPermission {
    all_ticket: boolean;
    group_ticket: boolean;
    technician_ticket: boolean;
}

export interface ITaskPermission {
    add: boolean;
    edit: boolean;
    approve: boolean;
    delete: boolean;
}

export enum RoleType {
    DEFAULT = "DEFAULT",
    EMPLOYEE = "EMPLOYEE",
    CUSTOMER = "CUSTOMER",
}
