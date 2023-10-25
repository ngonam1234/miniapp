import { error, HttpError, HttpStatus } from "app";
import axios from "axios";
import { configs } from "../configs";
import { GetServiceResBody } from "../interfaces/response";

export async function getAllServiceWithSubServices(
    tenant?: string,
    serviceName?: string
): Promise<{
    body?: GetServiceResBody;
    status?: HttpStatus;
    path: string;
}> {
    const url = `${configs.services.service.getUrl()}/with-subservices`;
    try {
        const res = await axios.get<GetServiceResBody>(`${url}`, {
            params: { tenant, serviceName },
        });
        return { body: res.data, path: url, status: res.status };
    } catch (e) {
        if (axios.isAxiosError(e) && e.response?.status) {
            return { status: e.response?.status, path: url };
        } else {
            throw new HttpError(error.service(url));
        }
    }
}
