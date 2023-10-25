export interface FindMatchingAutoResBody {
    id: string;
    fullname: string;
    email: string;
    phone: string;
    department?: {
        id: string;
        name: string;
    };
    position: string;
    is_active: boolean;
    created_time: Date;
    updated_time: Date;
    is_auto?: boolean;
    tenant: string;
    last_time_ticket?: Date;
    group?: {
        id: string;
        name: string;
    };
    info_auto: {
        id: string;
        name: string;
    };
}
