import { error, HttpError, HttpStatus } from "app";
import axios from "axios";
import { configs } from "../configs";
import { UserResBody } from "../interfaces/response";

export async function deleteDepartmentActivation(params: {
    departments: string[];
}): Promise<{ status: number; path: string }> {
    const url = `${configs.services.user.getUrl()}`;
    try {
        const res: { status: HttpStatus } = await axios.post(
            `${url}/delete-department`,
            params
        );
        return { status: res.status, path: url };
    } catch (e) {
        if (axios.isAxiosError(e) && e.response?.status) {
            return { status: e.response?.status, path: url };
        } else {
            throw new HttpError(error.service(url));
        }
    }
}

export async function getUserById(
    userId: string
): Promise<{ body?: UserResBody; status?: number }> {
    const url = `${configs.services.user.getUrl()}/${userId}/without-department`;
    try {
        const res = await axios.get<UserResBody>(url);
        return { body: res.data, status: res.status };
    } catch (e) {
        if (axios.isAxiosError(e) && e.response?.status) {
            return { status: e.response?.status };
        } else {
            throw new HttpError(error.service(url));
        }
    }
}

export async function CheckUserById(
    userId: string,
    tenant: string
): Promise<{ status?: number }> {
    const url = `${configs.services.user.getUrl()}/get-user-by-id-and-Tcode`;
    try {
        const res = await axios.get(url, {
            params: { userid: userId, tenant: tenant },
        });
        return { status: res.status };
    } catch (e) {
        if (axios.isAxiosError(e) && e.response?.status) {
            throw new HttpError({
                status: HttpStatus.BAD_REQUEST,
                code: "INVALID_DATA",
                description: {
                    en: `user id: ${userId} does not exist`,
                    vi: `user id: ${userId} không tồn tại`,
                },
                errors: [
                    {
                        param: "params.userid",
                        location: "body",
                        value: `${userId}`,
                    },
                ],
            });
        } else {
            throw new HttpError(error.service(url));
        }
    }
}

export async function getUserByIds(
    userIds: string[]
): Promise<{ body?: UserResBody[]; status?: number; url: string }> {
    const url = `${configs.services.user.getUrl()}/get-by-ids`;

    try {
        const res = await axios.post<UserResBody[]>(url, { ids: userIds });
        return { body: res.data, status: res.status, url };
    } catch (e) {
        if (axios.isAxiosError(e) && e.response?.status) {
            return { status: e.response?.status, url };
        } else {
            throw new HttpError(error.service(url));
        }
    }
}

export async function UpdateUserById(params: {
    id: string;
    fullname?: string;
    phone?: string;
    roles?: string[];
    department?: string;
    position?: string;
    is_active?: boolean;
    userId: string;
    userRoles: string[];
}): Promise<{ body?: UserResBody[]; status?: number }> {
    const url = `${configs.services.user.getUrl()}/update/${params.id}`;
    try {
        const res = await axios.put(url, { ...params });
        return { body: res.data, status: res.status };
    } catch (e) {
        if (axios.isAxiosError(e) && e.response?.status) {
            return { status: e.response?.status };
        } else {
            throw new HttpError(error.service(url));
        }
    }
}
