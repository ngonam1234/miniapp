export interface UserOfGroupResponse {
    userId: string;
    groups: {
        id: string;
        name: string;
        description: string;
        tenant_code: string;
        level: string;
        type: string;
    }[];
}
