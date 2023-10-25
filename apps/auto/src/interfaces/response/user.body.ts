export interface UserResBody {
    id: string;
    fullname: string;
    email: string;
    position: string;
    phone: string;
    tenant?: string;
    updated_time: Date;
    created_time: Date;
    is_active: boolean;
    activities?: string[];
    last_time_ticket: Date;
    is_auto: boolean;
}

export type GetUserResBody = UserResBody[];
