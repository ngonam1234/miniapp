import { HttpError, HttpStatus, error } from "app";
import { configs } from "../configs";
import axios from "axios";
import {
    ConnectBody,
    ConnectResBody,
} from "../interfaces/response/connect.body";
import { ITicket } from "../interfaces/models";

export async function buildConnectRequest(params: {
    requests: string[];
    incidents: string[];
    userId: string;
}): Promise<{
    data: number;
    status?: HttpStatus;
    path: string;
}> {
    const url = `${configs.services.request.getUrl()}/connects/`;
    try {
        const res = await axios.post<ConnectResBody>(url, params);
        return { data: res.data.number, path: url };
    } catch (e) {
        if (axios.isAxiosError(e) && e.response?.status) {
            return { data: 0, status: e.response?.status, path: url };
        } else {
            throw new HttpError(error.service(url));
        }
    }
}
export async function deleteConnectsIncident(params: { id: string }): Promise<{
    data: number;
    status?: HttpStatus;
    path: string;
}> {
    const url = `${configs.services.request.getUrl()}/connects/${params.id}`;
    try {
        const res = await axios.delete<{ modifiedCount: number }>(url);
        return { data: res.data.modifiedCount, path: url };
    } catch (e) {
        if (axios.isAxiosError(e) && e.response?.status) {
            return { data: 0, status: e.response?.status, path: url };
        } else {
            throw new HttpError(error.service(url));
        }
    }
}

export async function getConnectsIncident(params: {
    ids: string[];
    query?: string;
    sort?: string;
    size: number;
    page: number;
}): Promise<{
    data: ConnectBody[];
    status?: HttpStatus;
    path: string;
}> {
    const url = `${configs.services.request.getUrl()}/connects/connect-incident?page=${
        params.page
    }&size=${params.size}&sort=${params.sort ? params.sort : ""}&query=${
        params.query ? params.query : ""
    }`;
    try {
        const res = await axios.post<ConnectBody[]>(url, { ids: params.ids });
        return { data: res.data, path: url };
    } catch (e) {
        if (axios.isAxiosError(e) && e.response?.status) {
            return { data: [], status: e.response?.status, path: url };
        } else {
            throw new HttpError(error.service(url));
        }
    }
}

export async function updateConnectIncident(params: {
    ticketId: string;
    tenantTicket: string;
    requests: string[];
    userId: string;
}): Promise<{
    data: number;
    status?: HttpStatus;
    path: string;
}> {
    const url = `${configs.services.request.getUrl()}/connects/`;
    try {
        const res = await axios.put(url, params);
        return { data: res.data.modifiedCount, path: url };
    } catch (e) {
        if (axios.isAxiosError(e) && e.response?.status) {
            return { data: 0, status: e.response?.status, path: url };
        } else {
            throw new HttpError(error.service(url));
        }
    }
}

export async function getTicketNotConnectRequest(params: {
    query?: string;
    sort?: string;
    size: number;
    page: number;
    ticketId: string;
    ticketTenant: string;
    userRoles: string[];
    userTenant?: string;
    userId: string;
    type: string;
}): Promise<{
    data: ITicket[];
    status?: HttpStatus;
    path: string;
}> {
    const url = `${configs.services.request.getUrl()}/tickets/not-connect?query=${
        params.query === undefined ? "" : params.query
    }&sort=${params.sort === undefined ? "" : params.sort}&size=${
        params.size
    }&page=${params.page}&ticketId=${params.ticketId}&ticketTenant=${
        params.ticketTenant
    }&userRoles=${params.userRoles}&userTenant=${
        params.userTenant === undefined ? "" : params.userTenant
    }&userId=${params.userId}&type=${params.type}`;
    try {
        const res = await axios.get(url);
        return { data: res.data, path: url };
    } catch (e) {
        if (axios.isAxiosError(e) && e.response?.status) {
            return { data: [], status: e.response?.status, path: url };
        } else {
            throw new HttpError(error.service(url));
        }
    }
}
