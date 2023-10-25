import { HttpError, HttpStatus, error } from "app";
import { GetTypeResBody } from "../interfaces/response";
import { configs } from "../configs";
import axios from "axios";

export async function getTypes(params: {
    type: string;
    tenant: string;
    is_active: boolean;
}): Promise<{
    body?: GetTypeResBody;
    status: HttpStatus;
    path: string;
}> {
    let url: string;
    if (params.type === "REQUEST") {
        url = `${configs.services.request.getUrl()}/types`;
    } else if (params.type === "INCIDENT") {
        url = `${configs.services.incident.getUrl()}/types`;
    } else {
        throw new Error(`Unsupport type ${params.type}`);
    }
    try {
        const res = await axios.get<GetTypeResBody>(url, { params });
        return { body: res.data, path: url, status: res.status };
    } catch (e) {
        if (axios.isAxiosError(e) && e.response?.status) {
            return { status: e.response?.status, path: url };
        } else {
            throw new HttpError(error.service(url));
        }
    }
}
