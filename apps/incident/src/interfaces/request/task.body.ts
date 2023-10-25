export interface DoApprovalManyTaskReqBody {
    task_ids: string[];
    approval_status: string;
}
export interface FindTaskReqQuery {
    query?: string;
    sort?: string;
    size: number;
    page: number;
}
export interface CreateTaskReqBody {
    name: string;
    type?: string;
    description?: string;
    group: string;
    technician: string;
    estimated_time: {
        begin: Date;
        end: Date;
    };
    actual_time?: {
        begin?: Date;
        end?: Date;
    };
    approver?: string;
    needed_approval?: boolean;
    handling_time?: string;
    status: string;
}

export interface UpdateTaskReqBody {
    name: string;
    type?: string;
    description?: string;
    group: string;
    technician: string;
    estimated_time: {
        begin: Date;
        end: Date;
    };
    actual_time?: {
        begin?: Date;
        end?: Date;
    };
    handling_time?: string;
    approver?: string;
    approved_time?: Date;
    status?: string;
    comment?: string;
    added_worklog?: boolean;
    needed_approval?: boolean;
}

export interface DoApprovalTaskReqBody {
    approval_status: string;
    comment?: string;
}
