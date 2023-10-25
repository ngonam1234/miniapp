import { HttpError, HttpStatus, error } from "app";
import { GetUrgencyResBody } from "../interfaces/response";
import { configs } from "../configs";
import axios from "axios";

export async function getUrgencys(params: {
    tenant: string;
    is_active: boolean;
}): Promise<{
    body?: GetUrgencyResBody;
    status?: HttpStatus;
    path: string;
}> {
    const url = `${configs.services.incident.getUrl()}/urgencies`;
    try {
        const res = await axios.get<GetUrgencyResBody>(url, { params });
        return { body: res.data, path: url };
    } catch (e) {
        if (axios.isAxiosError(e) && e.response?.status) {
            return { status: e.response?.status, path: url };
        } else {
            throw new HttpError(error.service(url));
        }
    }
}
