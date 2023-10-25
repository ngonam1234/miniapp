import { HttpError, HttpStatus, error } from "app";
import axios from "axios";
import { configs } from "../configs";
import {
    GetCategoryResBody,
    GetServiceResBody,
    GetSubCategoryResBody,
    GetSubServiceResBody,
} from "../interfaces/response";

export async function getServices(params: {
    tenant: string;
    is_active: boolean;
}): Promise<{
    body?: GetServiceResBody;
    status: HttpStatus;
    path: string;
}> {
    const { is_active, tenant } = params;
    const url = `${configs.services.service.getUrl()}`;
    try {
        const res = await axios.get<GetServiceResBody>(url, {
            params: { tenant, is_active },
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

export async function getCategories(params: {
    tenant: string;
    service?: string;
    is_active: boolean;
}): Promise<{
    body?: GetCategoryResBody;
    status: HttpStatus;
    path: string;
}> {
    const { is_active, tenant } = params;
    const url = `${configs.services.service.getUrl()}`;
    try {
        const param = params.service && `${params.service}/`;
        const res = await axios.get<GetCategoryResBody>(
            `${url}/${param ?? ""}categories`,
            { params: { tenant, is_active } }
        );
        return { body: res.data, path: url, status: res.status };
    } catch (e) {
        if (axios.isAxiosError(e) && e.response?.status) {
            return { status: e.response?.status, path: url };
        } else {
            throw new HttpError(error.service(url));
        }
    }
}

export async function getSubCategories(params: {
    tenant: string;
    category?: string;
    is_active: boolean;
}): Promise<{
    body?: GetSubCategoryResBody;
    status: HttpStatus;
    path: string;
}> {
    const { is_active, tenant } = params;
    const url = `${configs.services.service.getUrl()}`;
    const param = params.category && `${params.category}/`;
    try {
        const res = await axios.get<GetSubCategoryResBody>(
            `${url}/categories/${param ?? ""}sub-categories`,
            { params: { tenant, is_active } }
        );
        return { body: res.data, path: url, status: res.status };
    } catch (e) {
        if (axios.isAxiosError(e) && e.response?.status) {
            return { status: e.response?.status, path: url };
        } else {
            throw new HttpError(error.service(url));
        }
    }
}

export async function getSubServices(params: {
    tenant: string;
    service?: string;
    is_active: boolean;
}): Promise<{
    body?: GetSubServiceResBody;
    status: HttpStatus;
    path: string;
}> {
    const { is_active, tenant } = params;
    const url = `${configs.services.service.getUrl()}`;
    try {
        const param = params.service && `${params.service}/`;
        const res = await axios.get<GetSubServiceResBody>(
            `${url}/${param ?? ""}sub-services`,
            { params: { tenant, is_active } }
        );
        return { body: res.data, path: url, status: res.status };
    } catch (e) {
        if (axios.isAxiosError(e) && e.response?.status) {
            return { status: e.response?.status, path: url };
        } else {
            throw new HttpError(error.service(url));
        }
    }
}
