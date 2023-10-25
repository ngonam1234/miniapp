import { error, HttpError, HttpStatus } from "app";
import axios from "axios";
import { configs } from "../configs";
import {
    GetCategoryResBody,
    GetServiceResBody,
    GetSubCategoryResBody,
    GetSubServiceResBody,
} from "../interfaces/response";

export async function getServices(params: { tenant: string }): Promise<{
    body?: GetServiceResBody;
    status?: HttpStatus;
    path: string;
}> {
    const url = `${configs.services.service.getUrl()}`;
    try {
        const res = await axios.get<GetServiceResBody>(url, {
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

export async function getCategories(params: {
    tenant: string;
    service: string;
}): Promise<{
    body?: GetCategoryResBody;
    status?: HttpStatus;
    path: string;
}> {
    const url = `${configs.services.service.getUrl()}`;
    try {
        const res = await axios.get<GetCategoryResBody>(
            `${url}/${params.service}/categories`,
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

export async function getSubCategories(params: {
    tenant: string;
    category: string;
}): Promise<{
    body?: GetSubCategoryResBody;
    status?: HttpStatus;
    path: string;
}> {
    const url = `${configs.services.service.getUrl()}`;
    try {
        const res = await axios.get<GetSubCategoryResBody>(
            `${url}/categories/${params.category}/sub-categories`,
            { params: { tenant: params.tenant } }
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

export async function getSubServices(params: {
    tenant: string;
    service: string;
}): Promise<{
    body?: GetSubServiceResBody;
    status?: HttpStatus;
    path: string;
}> {
    const url = `${configs.services.service.getUrl()}`;
    try {
        const res = await axios.get<GetSubServiceResBody>(
            `${url}/${params.service}/sub-services`,
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
