import axios from "axios";
import { configs } from "../configs";
import { UserResBody } from "../interfaces/response";
import { HttpError, error } from "app";

export async function getUserByIds(
    ids: string[]
): Promise<{ body?: UserResBody[]; status?: number; url: string }> {
    const url = `${configs.services.user.getUrl()}/get-by-ids`;
    try {
        const res = await axios.post<UserResBody[]>(url, { ids });
        return { body: res.data, status: res.status, url };
    } catch (e) {
        if (axios.isAxiosError(e) && e.response?.status) {
            return { status: e.response?.status, url };
        } else {
            throw new HttpError(error.service(url));
        }
    }
}
