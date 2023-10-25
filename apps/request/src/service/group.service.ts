import { error, HttpError, HttpStatus } from "app";
import axios from "axios";
import { configs } from "../configs";
import {
    GetGroupResBody,
    GetUserResBody,
    GroupResBody,
} from "../interfaces/response";

export async function getAllGroup(params: { tenant: string }): Promise<{
    body?: GetGroupResBody;
    status?: HttpStatus;
    path: string;
}> {
    const url = `${configs.services.group.getUrl()}`;
    try {
        const res = await axios.get<GetGroupResBody>(`${url}`, {
            params: { tenant: params.tenant },
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

export async function getGroupIdsByUserId(params: {
    userId: string;
}): Promise<string[]> {
    const url = `${configs.services.group.getUrl()}`;
    try {
        const res = await axios.get(`${url}/${params.userId}/groups`);
        return res.data;
    } catch (e) {
        throw new HttpError(error.service(url));
    }
}

export async function getGroupMembers(params: {
    tenant: string;
    group: string;
}): Promise<{
    body?: GetUserResBody;
    status?: HttpStatus;
    path: string;
}> {
    const url = `${configs.services.group.getUrl()}`;
    try {
        const res = await axios.get<GetUserResBody>(
            `${url}/${params.group}/members`,
            {
                params: { tenant: params.tenant },
            }
        );
        return { body: res.data, path: url };
    } catch (e) {
        if (axios.isAxiosError(e) && e.response?.status) {
            return { status: e.response?.status, path: url };
        } else {
            throw new HttpError(error.service(url));
        }
    }
}

export async function getGroupByName(
    name: string,
    tenant?: string
): Promise<{ body?: GroupResBody; status?: number; url: string }> {
    const url = `${configs.services.group.getUrl()}/get-by-name`;
    try {
        if (tenant && tenant !== "") {
            const res = await axios.get(url, {
                params: {
                    name,
                    tenant,
                },
            });
            return { body: res.data, status: res.status, url };
        } else {
            const res = await axios.get(url, {
                params: {
                    name,
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

export async function getGroupById(params: {
    tenant: string;
    group: string;
}): Promise<{
    body?: GroupResBody;
    status?: HttpStatus;
    path: string;
}> {
    const url = `${configs.services.group.getUrl()}/${params.group}`;
    try {
        const res = await axios.get<GroupResBody>(url, {
            params: { tenant: params.tenant },
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
