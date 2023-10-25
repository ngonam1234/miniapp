import { HttpError, HttpStatus, error } from "app";
import { GetPriorityResBody } from "../interfaces/response";
import { configs } from "../configs";
import axios from "axios";

export async function getPriorities(params: {
    type: string;
    tenant: string;
    is_active: boolean;
}): Promise<{
    body?: GetPriorityResBody;
    status: HttpStatus;
    path: string;
}> {
    let url: string;
    if (params.type === "REQUEST") {
        url = `${configs.services.request.getUrl()}/priorities`;
    } else if (params.type === "INCIDENT") {
        url = `${configs.services.incident.getUrl()}/priorities`;
    } else {
        throw new Error(`Unsupport type ${params.type}`);
    }
    console.log("url", url);

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
