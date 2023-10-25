import { ServiceType } from "../models";

export interface StatusResBody {
    id: string;
    name: string;
    description: string;
    count: number;
}

export interface ServiceResBody {
    id: string;
    name: string;
    type: ServiceType;
    description: string;
    department: string;
    time_process: number;
    time_support: string;
    tenant: string;
    created_time: string;
    updated_time: string;
    manager: string;
    is_active: boolean;
    is_deleted: boolean;
    sub_services: SubServiceResBody[];
    categories: CategoryResBody[];
}

export type GetServiceResBody = ServiceResBody[];

interface SubServiceResBody {
    id: string;
    name: string;
    description: string;
    is_deleted: boolean;
}

interface CategoryResBody {
    id: string;
    name: string;
    description: string;
    technical: string;
    sub_categories: SubCategoryResBody[];
    is_deleted: boolean;
}

interface SubCategoryResBody {
    id: string;
    name: string;
    description: string;
    is_deleted: boolean;
}
