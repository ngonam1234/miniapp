import { Result, success } from "app";

export async function createTemplate(params: {
    name: string;
    description: string;
    tenant: string;
    userRoles: string[];
    userId: string;
}): Promise<Result> {
    return success.created(params);
}
