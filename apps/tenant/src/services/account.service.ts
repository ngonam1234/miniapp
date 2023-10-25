import { error, HttpError, HttpStatus } from "app";
import { configs } from "../configs";
import axios from "axios";

export async function updateTenantActivation(params: {
    tenants: string[];
    status: boolean;
}): Promise<{ status: number; path: string }> {
    const url = `${configs.services.auth.getUrl()}/accounts`;

    try {
        const res: { status: HttpStatus } = await axios.post(
            `${url}/update-tenant-activation`,
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

export async function getRolesById(
    id: string
): Promise<{ status?: number; path?: string; roles?: string[] }> {
    const url = `${configs.services.auth.getUrl()}/accounts/get-roles-by-id/${id}`;
    try {
        const res = await axios.get<{ roles: string[] }>(url);
        return { roles: res.data.roles };
    } catch (e) {
        if (axios.isAxiosError(e) && e.response?.status) {
            return { status: e.response?.status, path: url };
        } else {
            throw new HttpError(error.service(url));
        }
    }
}
