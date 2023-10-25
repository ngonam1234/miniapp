import { HttpError, HttpStatus, error } from "app";
import axios from "axios";
import { configs } from "../configs";
import { GetUserResBody } from "../interfaces/response";

export async function getUser(params: {
    tenant: string;
    query?: string;
    is_active: boolean;
}): Promise<{
    body?: GetUserResBody;
    status: HttpStatus;
    path: string;
}> {
    let query = params.query;
    const { tenant, is_active } = params;
    const url = `${configs.services.user.getUrl()}/`;
    const con = `eq(is_active,${is_active})`;
    query = query ? `and(${con},query)` : con;
    try {
        const res = await axios.get<{ data: GetUserResBody }>(url, {
            params: { tenant: tenant, size: -1, query },
        });
        return { body: res.data.data, path: url, status: res.status };
    } catch (e) {
        if (axios.isAxiosError(e) && e.response?.status) {
            return { status: e.response?.status, path: url };
        } else {
            throw new HttpError(error.service(url));
        }
    }
}

export async function getUserByIds(ids: string[]): Promise<{
    body?: GetUserResBody;
    status: HttpStatus;
    path: string;
}> {
    const url = `${configs.services.user.getUrl()}/get-by-ids`;
    try {
        const res = await axios.post<{ data: GetUserResBody }>(url, ids);
        return { body: res.data.data, path: url, status: res.status };
    } catch (e) {
        if (axios.isAxiosError(e) && e.response?.status) {
            return { status: e.response?.status, path: url };
        } else {
            throw new HttpError(error.service(url));
        }
    }
}
