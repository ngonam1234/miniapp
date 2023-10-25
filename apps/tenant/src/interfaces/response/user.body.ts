export interface UserResBody {
    id: string;
    tenant: string;
    fullname: string;
    is_active: boolean;
    activities: unknown;
    email: string;
    department?: string;
}
