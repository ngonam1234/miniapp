export interface CreateCategoryReqBody {
    name: string;
    description?: string;
    technicians: string[];
    service: string;
}

export interface UpdateCategoryReqBody {
    name: string;
    description?: string;
    technicians: string[];
    service: string;
}

export interface CreateSubCategoryReqBody {
    name: string;
    description?: string;
}

export interface UpdateSubCategoryReqBody {
    name?: string;
    description?: string;
}
