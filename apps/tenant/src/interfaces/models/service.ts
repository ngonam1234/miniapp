export interface IService {
    id: string;
    name: string;
    type: "BUSINESS_SERVICE" | "TECHNICAL_SERVICE";
    description?: string;
    sub_services: ISubService[];
    categories: ICategory[];
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

export interface ISubService {
    id: string;
    name: string;
    description?: string;
    sub_services_L2: ISubServiceL2[];
    is_deleted: boolean;
}

export interface ISubServiceL2 {
    id: string;
    name: string;
    description?: string;
    is_deleted: boolean;
}

export interface ICategory {
    id: string;
    name: string;
    description?: string;
    technician?: string;
    is_deleted: boolean;
    sub_categories: ISubCategory[];
}

export interface ISubCategory {
    id: string;
    name: string;
    description?: string;
    is_deleted: boolean;
}
