import { HttpError, HttpStatus, error } from "app";
import { GetImpactResBody } from "../interfaces/response";
import { configs } from "../configs";
import axios from "axios";

export async function getImpacts(params: {
    tenant: string;
    is_active: boolean;
}): Promise<{
    body?: GetImpactResBody;
    status: HttpStatus;
    path: string;
}> {
    const url = `${configs.services.incident.getUrl()}/impacts`;
    try {
        const res = await axios.get<GetImpactResBody>(url, { params });
        return { body: res.data, path: url, status: res.status };
    } catch (e) {
        if (axios.isAxiosError(e) && e.response?.status) {
            return { status: e.response?.status, path: url };
        } else {
            throw new HttpError(error.service(url));
        }
    }
}
