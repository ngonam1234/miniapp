export interface UserResBody {
    id: string;
    fullname: string;
    email: string;
    department?: {
        id: string;
        name: string;
    };
    position: string;
    phone: string;
    tenant?: string;
    updated_time: Date;
    created_time: Date;
    is_active: boolean;
    activities?: string[];
}

export interface UpdateAssigneeResBody {
    data: string;
}

export type GetUserResBody = UserResBody[];
