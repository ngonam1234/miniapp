import { FilterQuery } from "mongoose";
import { IAuto } from "../../interfaces/model";
import { HttpError, HttpStatus } from "app";
import Auto from "../../models/auto.model";

export async function checkAutoExists(params: {
    name: string;
    autoId?: string;
    tenant?: string;
    type: string
}): Promise<void> {
    const match: FilterQuery<IAuto> = {
        name: {
            $regex: `^${params.name}$`,
            $options: "i",
        },
        is_delete: false,
        type: params.type,
        tenant: params.tenant,
    };
    params.tenant ? (match.tenant = params.tenant) : null;
    const auto = await Auto.findOne(match);
    if (auto) {
        if (params.autoId === auto.id) {
            return;
        }
        throw new HttpError({
            status: HttpStatus.BAD_REQUEST,
            code: "INVALID_DATA",
            description: {
                en: "Auto name already exists",
                vi: "Tên phân công việc đã tồn tại",
            },
            errors: [
                {
                    param: "name",
                    location: "body",
                    value: params.name,
                },
            ],
        });
    }
}
