import { error, HttpError } from "app";
import axios from "axios";
import { configs } from "../configs";
import {
    GetTenantResBody,
    IDepartmentResBody,
    TenantResBody,
} from "../interfaces/response";

export async function getTenantByCode(
    tenantCode: string
): Promise<{ body?: GetTenantResBody; status?: number }> {
    const url = `${configs.services.tenant.getUrl()}/tenants`;
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

export async function getDepartmentByIds(
    ids: string[]
): Promise<{ body?: IDepartmentResBody[]; status?: number }> {
    const url = `${configs.services.tenant.getUrl()}/departments/get-by-ids`;
    try {
        const res: {
            data: IDepartmentResBody[];
        } = await axios.post(url, { ids: ids });

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
    tenantCodes: string[]
): Promise<{ body?: TenantResBody[]; status?: number }> {
    const url = `${configs.services.tenant.getUrl()}/tenants/get-by-codes`;
    try {
        const res: {
            data: TenantResBody[];
        } = await axios.post(url, { codes: tenantCodes });
        return { body: res.data };
    } catch (e) {
        if (axios.isAxiosError(e) && e.response?.status) {
            return { status: e.response?.status };
        } else {
            throw new HttpError(error.service(url));
        }
    }
}

export async function getTenantByEmail(
    email: string
): Promise<{ body?: { code: string; is_active: boolean }; status?: number }> {
    const url = `${configs.services.tenant.getUrl()}/tenants/get-by-email`;
    try {
        const res: {
            data: { code: string; is_active: boolean };
        } = await axios.post(url, { email: email });
        return { body: res.data };
    } catch (e) {
        if (axios.isAxiosError(e) && e.response?.status) {
            return { status: e.response?.status };
        } else {
            throw new HttpError(error.service(url));
        }
    }
}

export async function findDepartmentById(params: {
    id: string;
    tenant?: string;
}): Promise<{ body?: IDepartmentResBody; status?: number }> {
    const url = `${configs.services.tenant.getUrl()}/departments/${params.id}`;
    try {
        const res = await axios.get<IDepartmentResBody>(url, {
            params: { tenant: params.tenant },
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

export async function addMemberToDepartment(params: {
    department: string;
    user: string;
}): Promise<{ status?: number; path: string }> {
    const url =
        `${configs.services.tenant.getUrl()}/departments/` +
        `${params.department}/members/add`;
    try {
        const res = await axios.post(url, { user: params.user });
        return { status: res.status, path: url };
    } catch (e) {
        if (axios.isAxiosError(e) && e.response?.status) {
            return { status: e.response?.status, path: url };
        } else {
            throw new HttpError(error.service(url));
        }
    }
}

export async function removeMemberFromDepartment(params: {
    department: string;
    user: string;
}): Promise<{ status?: number; path: string }> {
    const url =
        `${configs.services.tenant.getUrl()}/departments/` +
        `${params.department}/members/remove`;
    try {
        const res = await axios.post(url, { user: params.user });
        return { status: res.status, path: url };
    } catch (e) {
        if (axios.isAxiosError(e) && e.response?.status) {
            return { status: e.response?.status, path: url };
        } else {
            throw new HttpError(error.service(url));
        }
    }
}

export async function increaseUser(
    data: {
        tenant: string;
        amount: number;
    }[]
): Promise<{ body?: unknown }> {
    const url = `${configs.services.tenant.getUrl()}/tenants/`;
    try {
        const body = await axios.put(`${url}increase-user`, { data });
        return { body: body };
    } catch (e) {
        throw new HttpError(error.service(url));
    }
}
