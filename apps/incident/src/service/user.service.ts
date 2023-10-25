import { error, HttpError } from "app";
import axios from "axios";
import { configs } from "../configs";
import {
    GetUserResBody,
    UpdateAssigneeResBody,
    UserResBody,
} from "../interfaces/response";

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

export async function updateTimeAssignee(
    id: string,
    tenant: string,
    is_auto: boolean
): Promise<{ body?: UpdateAssigneeResBody[]; status?: number; url: string }> {
    const url = `${configs.services.user.getUrl()}/${id}`;
    try {
        const res = await axios.put<UpdateAssigneeResBody[]>(url, {
            tenant,
            is_auto,
        });
        return { body: res.data, status: res.status, url };
    } catch (e) {
        if (axios.isAxiosError(e) && e.response?.status) {
            return { status: e.response?.status, url };
        } else {
            throw new HttpError(error.service(url));
        }
    }
}

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

export async function findUser(
    tenant: string,
    query?: string,
    is_active?: boolean
): Promise<{ body?: GetUserResBody; status?: number; url: string }> {
    const url = `${configs.services.user.getUrl()}`;
    const params = { tenant, query, is_active };
    try {
        const res = await axios.get(url, { params });
        return { body: res.data, status: res.status, url };
    } catch (e) {
        if (axios.isAxiosError(e) && e.response?.status) {
            return { status: e.response?.status, url };
        } else {
            throw new HttpError(error.service(url));
        }
    }
}

export async function getUserByEmail(
    email: string,
    tenant?: string
): Promise<{ body?: UserResBody; status?: number; url: string }> {
    const url = `${configs.services.user.getUrl()}/get-by-email`;
    try {
        if (tenant && tenant !== "") {
            const res = await axios.get(url, {
                params: {
                    email,
                    tenant,
                },
            });
            return { body: res.data, status: res.status, url };
        } else {
            const res = await axios.get(url, {
                params: {
                    email,
                },
            });
            return { body: res.data, status: res.status, url };
        }
    } catch (e) {
        if (axios.isAxiosError(e) && e.response?.status) {
            return { status: e.response?.status, url };
        } else {
            throw new HttpError(error.service(url));
        }
    }
}

export async function getAllNotRoleEU(params: {
    userRoles: string[];
    userTenant?: string;
    userId: string;
}): Promise<{ body?: UserResBody[]; status?: number; url: string }> {
    const url = `${configs.services.user.getUrl()}/not-eu`;
    try {
        const res = await axios.post<UserResBody[]>(url, params);
        return { body: res.data, status: res.status, url };
    } catch (e) {
        if (axios.isAxiosError(e) && e.response?.status) {
            return { status: e.response?.status, url };
        } else {
            throw new HttpError(error.service(url));
        }
    }
}

export async function getRequesters(
    tenant?: string,
    is_active?: boolean
): Promise<{ body?: { id: string; name: string }[]; status?: number }> {
    const url = `${configs.services.user.getUrl()}/all`;
    try {
        const res = await axios.get<{ id: string; fullname: string }[]>(
            `${url}`,
            {
                params: {
                    tenant: tenant,
                    is_active: is_active,
                },
            }
        );
        return { body: res.data.map((b) => ({ id: b.id, name: b.fullname })) };
    } catch (e) {
        if (axios.isAxiosError(e) && e.response?.status) {
            return { status: e.response?.status };
        } else {
            throw new HttpError(error.service(url));
        }
    }
}
