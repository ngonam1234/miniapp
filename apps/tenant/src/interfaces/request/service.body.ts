export interface CreateServiceReqBody {
    name: string;
    type: string;
    description?: string;
    time_process?: number;
    time_support?: string;
    manager?: string;
    department?: string;
    tenant: string;
    is_active: boolean;
}

/* Defining the interface for the body of the request. */
export interface UpdateServiceReqBody {
    name: string;
    type?: string;
    description?: string;
    time_process?: number;
    time_support?: string;
    manager?: string;
    department?: string;
    is_active: boolean;
}

export interface CreateSubServiceReqBody {
    name: string;
}

export interface CreateManySubServiceReqBody {
    names: string[];
}
export interface UpdateSubServiceReqBody {
    name?: string;
    description?: string;
}
