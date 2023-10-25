import { HttpError, error } from "app";
import axios from "axios";
import { configs } from "../configs";
import { IRole } from "../interfaces/response";

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
