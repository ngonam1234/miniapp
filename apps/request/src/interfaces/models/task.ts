export interface ITask {
    id: string;
    name: string;
    description?: string;
    ticket_id: string;
    type?: {
        id?: string;
        name?: string;
    };
    group: {
        id: string;
        name: string;
    };
    technician: {
        id: string;
        name: string;
    };
    status: ETaskStatus;
    approval_status?: ETaskApprovalStatus;
    actual_time?: {
        begin?: Date;
        end?: Date;
    };
    estimated_time: {
        begin: Date;
        end: Date;
    };
    handling_time?: "8x5" | "24x5" | "24x24";
    approver?: {
        id: string;
        fullname?: string;
        email: string;
    };
    activities: ITaskActivity[];
    needed_approval?: boolean;
    added_worklog?: boolean;
    created_by: string;
    created_time: Date;
    updated_time?: Date;
    updated_by?: string;
    is_deleted?: boolean;
}

export interface ITaskActivity {
    action: ETaskAction;
    actor: IUser;
    time: Date;
    comment?: ICommentTask;
}

export enum ETaskAction {
    CREATE = "CREATE",
    UPDATE = "UPDATE",
    APPROVE = "APPROVE",
}

export enum ETaskStatus {
    UNHANDLED = "UNHANDLED",
    HANDLING = "HANDLING",
    FINISHED = "FINISHED",
}

export enum ETaskApprovalStatus {
    WAITINGAPPROVAL = "WAITING_APPROVAL",
    REJECT = "REJECT",
    APPROVED = "APPROVED",
    NEEDCLARIFICATION = "NEED_CLARIFICATION",
}

export interface ICommentTask {
    id?: string;
    content?: string;
    created_time?: Date;
    creator?: IUser;
}
export interface IUser {
    id: string;
    fullname: string;
    email: string;
    department?: {
        id: string;
        name: string;
    };
    is_active: boolean;
}
