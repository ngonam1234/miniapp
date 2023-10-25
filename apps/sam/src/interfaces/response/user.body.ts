export interface UserResBody {
    id: string;
    fullname: string;
    email: string;
    department: string;
    position: string;
    phone: string;
    tenant?: string;
    updated_time: Date;
    created_time: Date;
    is_active: boolean;
    activities?: string[];
}

export type GetUserResBody = UserResBody[];
