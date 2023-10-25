export interface CreateTenantReqBody {
    code: string;
    address?: string;
    name?: string;
    description?: string;
    phone?: string;
    email?: string;
    is_active: boolean;
}

export interface UpdateTenantReqBody {
    address?: string;
    name?: string;
    email?: string;
    phone?: string;
    description?: string;
    is_active?: boolean;
}

export interface IncreaseUserReqBody {
    data: {
        tenant: string;
        amount: number;
    }[];
}

export interface UpdateActivationReqBody {
    codes: string[];
    status: boolean;
}
