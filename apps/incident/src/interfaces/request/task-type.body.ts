export interface CreateTaskTypeBody {
    name: string;
    description?: string;
    is_active: boolean;
}

export interface UpdateTaskTypeBody {
    name: string;
    description?: string;
    is_active: boolean;
}
