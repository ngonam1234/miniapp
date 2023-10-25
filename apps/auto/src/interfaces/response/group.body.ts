export interface GroupResBody {
    id: string;
    fullname: string;
    email: string;
    tenant: string;
    is_active: boolean;
    is_auto: boolean;
    last_time_ticket: Date;
}
[];

export interface GroupInfoResBody {
    id: string;
    name: string;
    description?: string;
    tenant: string;
    created_time: Date;
    is_active: boolean;
    leader: {
        id: string;
        fullname: string;
        email: string;
        phone: string;
        department: string;
        position: string;
        is_active: boolean;
        created_time: Date;
    };
    members: [
        {
            id: string;
            fullname: string;
            email: string;
            phone: string;
            department: string;
            position: string;
            is_active: boolean;
            created_time: Date;
            updated_time: Date;
            is_auto: boolean;
            tenant?: string;
            last_time_ticket: Date;
        }
    ];
}

export interface GroupAllResBody {
    id: string;
    name: string;
    description?: string;
    leader_id?: string;
    tenant: string;
    created_time: Date;
    is_active: boolean;
    members: string[];
}

export type GetGroupResBody = GroupAllResBody[];
