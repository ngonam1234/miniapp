export interface Row {
    stt: string;
    code: string;
    name: string;
    requester: string;
    description: string,
    email: string;
    department?: string;
    created_time: string;
    creator?: string;
    status?: string;
    type?: string;
    channel?: string;
    group?: string;
    technician?: string;
    priority?: string;
    service?: string;
    sub_service?: string;
    overdue_time?: string;
    sla?: string;
    time_limit_response?: string;
    time_limit_resolving?: string;
    overdue_time_response?: string;
    overdue_time_resolving?: string;
    closed_time: string;
    is_overdue_response?: string;
    is_overdue_resolving?: string;
}
