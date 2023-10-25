import { HttpError, HttpStatus, error } from "app";
import { GetIdentityResBody } from "../interfaces/response";
import { configs } from "../configs";
import axios from "axios";

export async function getNextTicketNumber(params: { key: string }): Promise<{
    body?: GetIdentityResBody;
    status?: HttpStatus;
    path: string;
}> {
    const url = `${configs.services.identity.getUrl()}`;
    try {
        const res = await axios.get<GetIdentityResBody>(`${url}`, {
            params: { key: params.key },
        });
        return { body: res.data, path: url };
    } catch (e) {
        if (axios.isAxiosError(e) && e.response?.status) {
            return { status: e.response?.status, path: url };
        } else {
            throw new HttpError(error.service(url));
        }
    }
}
