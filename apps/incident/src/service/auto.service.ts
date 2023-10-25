import axios from "axios";
import { configs } from "../configs";
import { FindMatchingAutoResBody } from "../interfaces/response";
import { HttpError, error } from "app";

export async function findMatchingAutoForTicket(
    ticket: ITicket,
    apply_request: string,
    type: string
): Promise<{ body?: FindMatchingAutoResBody; status?: number; url: string }> {
    const url = `${configs.services.auto.getUrl()}/match?apply_request=${apply_request}&type=${type}`;
    try {
        const res = await axios.post<FindMatchingAutoResBody>(url, ticket);
        return { body: res.data, status: res.status, url };
    } catch (e) {
        if (axios.isAxiosError(e) && e.response?.status) {
            return { status: e.response?.status, url };
        } else {
            throw new HttpError(error.service(url));
        }
    }
}

interface ITicket {
    status?: IDefaultField;
    priority?: IDefaultField;
    type?: IDefaultField;
    group?: IDefaultField;
    service?: IDefaultField;
    channel?: IDefaultField;
    sub_service: IDefaultField;
    category?: IDefaultField;
    sub_category?: IDefaultField;
}

interface IDefaultField {
    id: string;
    name: string;
}
