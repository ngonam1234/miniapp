import { error, HttpError } from "app";
import axios from "axios";
import { configs } from "../configs";
import { TotalUserBody, UserResBody } from "../interfaces/response";

export async function getUserById(
    userId: string
): Promise<{ body?: UserResBody; status?: number; url: string }> {
    const url = `${configs.services.user.getUrl()}/${userId}`;
    try {
        const res = await axios.get<UserResBody>(url);
        return { body: res.data, status: res.status, url };
    } catch (e) {
        if (axios.isAxiosError(e) && e.response?.status) {
            return { status: e.response?.status, url };
        } else {
            throw new HttpError(error.service(url));
        }
    }
}

export async function getTotalUserHaveRole(
    role: string,
    tenant?: string
): Promise<{ body?: TotalUserBody; status?: number; url: string }> {
    const url = `${configs.services.user.getUrl()}/total-user-have-role?role=${role}&tenant=${
        tenant ? tenant : ""
    }`;
    try {
        const res = await axios.get<TotalUserBody>(url);
        return { body: res.data, status: res.status, url };
    } catch (e) {
        if (axios.isAxiosError(e) && e.response?.status) {
            return { status: e.response?.status, url };
        } else {
            throw new HttpError(error.service(url));
        }
    }
}
