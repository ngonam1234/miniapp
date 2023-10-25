export interface CreateRoleEmployeeReqBody {
    name: string;
    description: string;
    is_active?: boolean;
    request_permission?: {
        all?: boolean;
        view?: boolean;
        add?: boolean;
        edit?: boolean;
        edit_priority?: boolean;
        edit_impact?: boolean;
        edit_urgency?: boolean;
        edit_due_date?: boolean;
        edit_due_date_SLA?: boolean;
        edit_requester?: boolean;
        change_status_to_resolved?: boolean;
        change_status_to_closed?: boolean;
        change_status_to_cancelled?: boolean;
    };
    incident_permission?: {
        all?: boolean;
        view?: boolean;
        add?: boolean;
        edit?: boolean;
        edit_priority?: boolean;
        edit_impact?: boolean;
        edit_urgency?: boolean;
        edit_due_date?: boolean;
        edit_due_date_SLA?: boolean;
        edit_requester?: boolean;
        change_status_to_resolved?: boolean;
        change_status_to_closed?: boolean;
        change_status_to_cancelled?: boolean;
    };
    solution_permission?: {
        all?: boolean;
        view?: boolean;
        add?: boolean;
        edit?: boolean;
        approve?: boolean;
    };
    advanced_view_permission?: {
        all_ticket?: boolean;
        group_ticket?: boolean;
        technician_ticket?: boolean;
    };
    task_permission?: {
        add?: boolean;
        edit?: boolean;
        approve?: boolean;
        delete?: boolean;
    };
}

export interface CreateRoleCustomerReqBody {
    name: string;
    description: string;
    is_active?: boolean;
    request_permission?: {
        view?: boolean;
        view_only_requester?: boolean;
        add?: boolean;
        approve?: boolean;
    };
    incident_permission?: {
        view?: boolean;
        view_only_requester?: boolean;
        add?: boolean;
        approve?: boolean;
    };
    solution_permission?: {
        view?: boolean;
    };
}

export interface UpdateRoleEmployeeReqBody {
    name: string;
    description?: string;
    is_active?: boolean;
    request_permission?: {
        all?: boolean;
        view?: boolean;
        add?: boolean;
        edit?: boolean;
        edit_priority?: boolean;
        edit_impact?: boolean;
        edit_urgency?: boolean;
        edit_due_date?: boolean;
        edit_due_date_SLA?: boolean;
        edit_requester?: boolean;
        change_status_to_resolved?: boolean;
        change_status_to_closed?: boolean;
        change_status_to_cancelled?: boolean;
    };
    incident_permission?: {
        all?: boolean;
        view?: boolean;
        add?: boolean;
        edit?: boolean;
        edit_priority?: boolean;
        edit_impact?: boolean;
        edit_urgency?: boolean;
        edit_due_date?: boolean;
        edit_due_date_SLA?: boolean;
        edit_requester?: boolean;
        change_status_to_resolved?: boolean;
        change_status_to_closed?: boolean;
        change_status_to_cancelled?: boolean;
    };
    solution_permission?: {
        all?: boolean;
        view?: boolean;
        add?: boolean;
        edit?: boolean;
        approve?: boolean;
    };
    advanced_view_permission?: {
        all_ticket?: boolean;
        group_ticket?: boolean;
        technician_ticket?: boolean;
    };
    task_permission?: {
        add?: boolean;
        edit?: boolean;
        approve?: boolean;
        delete?: boolean;
    };
}

export interface UpdateRoleCustomerReqBody {
    name: string;
    description?: string;
    is_active?: boolean;
    request_permission?: {
        view?: boolean;
        view_only_requester?: boolean;
        add?: boolean;
        approve?: boolean;
    };
    incident_permission?: {
        view?: boolean;
        view_only_requester?: boolean;
        add?: boolean;
        approve?: boolean;
    };
    solution_permission?: {
        view?: boolean;
    };
}
