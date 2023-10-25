import { HttpError, HttpStatus, error } from "app";
import axios from "axios";
import { configs } from "../configs";
import { GetPriorityResBody } from "../interfaces/response";

export async function getPriorities(params: {
    module: string;
    tenant: string;
    is_active: boolean;
}): Promise<{
    body?: GetPriorityResBody;
    status: HttpStatus;
    path: string;
}> {
    let url: string;
    if (params.module === "REQUEST") {
        url = `${configs.services.request.getUrl()}/priorities`;
    } else if (params.module === "INCIDENT") {
        url = `${configs.services.incident.getUrl()}/priorities`;
    } else {
        throw new Error(`Unsupport type ${params.module}`);
    }
    try {
        const res = await axios.get<GetPriorityResBody>(url, { params });
        return { body: res.data, path: url, status: res.status };
    } catch (e) {
        if (axios.isAxiosError(e) && e.response?.status) {
            return { status: e.response?.status, path: url };
        } else {
            throw new HttpError(error.service(url));
        }
    }
}
