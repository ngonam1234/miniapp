export interface CreateReqBody {
    name: string;
    description: string;
    is_active: boolean;
}

export interface CreateStatusReqBody {
    name: string;
    description: string;
    is_active: boolean;
    count_time: boolean;
}

export interface UpdateReqBody {
    name: string;
    description?: string;
    is_active?: boolean;
}

export interface UpdateStatusReqBody {
    name?: string;
    description?: string;
    count_time?: boolean;
    is_active?: boolean;
}

export interface UpdateActivationReqBody {
    ids: string[];
    status: boolean;
}
