import { Result, success } from "app";
import { ActiveTemplate } from "../../models";
import { v1 } from "uuid";

export async function createTemplate(params: {
    name: string;
    description: string;
    tenant: string;
    userRoles: string[];
    userId: string;
}): Promise<Result> {
    return success.created(params);
}

export async function createActiveTemplateIn(params: {
    code: string;
    template: string[];
    is_active: boolean;
}): Promise<Result> {
    const active = new ActiveTemplate({
        id: v1(),
        code: params.code,
        template: params.template,
        is_active: params.is_active,
    });
    await active.save();

    return success.created(active);
}
