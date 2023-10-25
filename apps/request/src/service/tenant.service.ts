import { error, HttpError } from "app";
import axios from "axios";
import { configs } from "../configs";
import { GetDepartmentResBody, GetTenantResBody } from "../interfaces/response";

export async function getTenantByCode(
    tenantCode: string
): Promise<{ body?: GetTenantResBody; status?: number }> {
    const url = `${configs.services.tenant.getUrl()}`;
    try {
        const res = await axios.get<GetTenantResBody>(
            `${url}/${tenantCode}?type=code`
        );
        return { body: res.data };
    } catch (e) {
        if (axios.isAxiosError(e) && e.response?.status) {
            return { status: e.response?.status };
        } else {
            throw new HttpError(error.service(url));
        }
    }
}

export async function getTenantByCodes(
    tenantCode: string[]
): Promise<{ body?: GetTenantResBody[]; status?: number }> {
    const url = `${configs.services.tenant.getUrl()}`;
    try {
        const res = await axios.post<GetTenantResBody[]>(
            `${url}/get-by-codes`,
            {
                codes: tenantCode,
            }
        );
        return { body: res.data };
    } catch (e) {
        if (axios.isAxiosError(e) && e.response?.status) {
            return { status: e.response?.status };
        } else {
            throw new HttpError(error.service(url));
        }
    }
}
export async function getDepartments(
    tenantCode: string
): Promise<{ body?: GetDepartmentResBody[]; status?: number }> {
    const url = `${configs.services.department.getUrl()}`;
    try {
        const res = await axios.get<GetDepartmentResBody[]>(`${url}`, {
            params: {
                tenant: tenantCode,
            },
        });
        return { body: res.data };
    } catch (e) {
        if (axios.isAxiosError(e) && e.response?.status) {
            return { status: e.response?.status };
        } else {
            throw new HttpError(error.service(url));
        }
    }
}
export async function getServeices(
    tenantCode?: string,
    is_active?: boolean
): Promise<{ body?: { id: string; name: string }[]; status?: number }> {
    const uri = configs.services.tenant.getUrl().replace("tenants", "services");
    const url = `${uri}`;
    try {
        const res = await axios.get<{ id: string; name: string }[]>(`${url}`, {
            params: {
                tenant: tenantCode,
                is_active: is_active,
            },
        });
        return { body: res.data.map((b) => ({ id: b.id, name: b.name })) };
    } catch (e) {
        if (axios.isAxiosError(e) && e.response?.status) {
            return { status: e.response?.status };
        } else {
            throw new HttpError(error.service(url));
        }
    }
}
