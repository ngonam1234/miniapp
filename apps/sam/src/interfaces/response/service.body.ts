export interface ServiceResBody {
    id: string;
    name: string;
    type: "BUSINESS_SERVICE" | "TECHNICAL_SERVICE";
    description?: string;
    manager?: string;
    department: string;
    time_process: number;
    time_support: "8x5" | "24x7";
    tenant: string;
    created_time: Date;
    updated_time: Date;
    is_active: boolean;
    is_deleted: boolean;
}

export interface SubServiceResBody {
    id: string;
    name: string;
    description?: string;
    is_deleted: boolean;
}

export interface CategoryResBody {
    id: string;
    name: string;
    description?: string;
    technician?: string;
    is_deleted: boolean;
}

export interface SubCategoryResBody {
    id: string;
    name: string;
    description?: string;
    is_deleted: boolean;
}

export type GetSubCategoryResBody = SubCategoryResBody[];
export type GetCategoryResBody = CategoryResBody[];
export type GetSubServiceResBody = SubServiceResBody[];
export type GetServiceResBody = ServiceResBody[];
