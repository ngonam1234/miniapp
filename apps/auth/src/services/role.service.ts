import { error, HttpError } from "app";
import axios from "axios";
import { configs } from "../configs";
import { IRole, TypeRole } from "../interfaces/response";

export async function findRoleByIds(
    roleIds: string[],
    tenant?: string
): Promise<{ body?: IRole[]; status?: number; path: string }> {
    const url = `${configs.services.role.getUrl()}/role-by-ids`;
    try {
        const res = await axios.get<IRole[]>(url, {
            params: { roleIds, tenant },
        });
        return { body: res.data, status: res.status, path: url };
    } catch (e) {
        if (axios.isAxiosError(e) && e.response?.status) {
            return { status: e.response?.status, path: url };
        } else {
            throw new HttpError(error.service(url));
        }
    }
}

export async function findRolesHaveApprovalPermission(
    tenant?: string
): Promise<{ body?: IRole[]; status?: number; path: string }> {
    const url = `${configs.services.role.getUrl()}/role-approval-permission`;
    try {
        const res = await axios.get<IRole[]>(url, {
            params: { tenant },
        });
        return { body: res.data, status: res.status, path: url };
    } catch (e) {
        if (axios.isAxiosError(e) && e.response?.status) {
            return { status: e.response?.status, path: url };
        } else {
            throw new HttpError(error.service(url));
        }
    }
}

export async function findRoleType(
    roleIds: string[],
    tenant?: string
): Promise<{ body?: TypeRole; status?: number; path: string }> {
    const url = `${configs.services.role.getUrl()}/role-type`;
    try {
        const res = await axios.get<TypeRole>(url, {
            params: { roleIds, tenant },
        });
        return { body: res.data, status: res.status, path: url };
    } catch (e) {
        if (axios.isAxiosError(e) && e.response?.status) {
            return { status: e.response?.status, path: url };
        } else {
            throw new HttpError(error.service(url));
        }
    }
}

export async function findRoleNotCustomer(
    tenant?: string
): Promise<{ body?: string[]; status?: number; path: string }> {
    const url = `${configs.services.role.getUrl()}/role-not-customer`;
    try {
        const res = await axios.get<string[]>(url, {
            params: { tenant },
        });
        return { body: res.data, status: res.status, path: url };
    } catch (e) {
        if (axios.isAxiosError(e) && e.response?.status) {
            return { status: e.response?.status, path: url };
        } else {
            throw new HttpError(error.service(url));
        }
    }
}
