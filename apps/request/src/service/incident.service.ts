import { HttpError, HttpStatus, error } from "app";
import { configs } from "../configs";
import axios from "axios";
import {
    ConnectBody,
    ConnectResBody,
} from "../interfaces/response/connect.body";
import { ITicket } from "../interfaces/models";

export async function buildConnectIncident(params: {
    requests: string[];
    incidents: string[];
    userId: string;
}): Promise<{
    data: number;
    status?: HttpStatus;
    path: string;
}> {
    const url = `${configs.services.incident.getUrl()}/connects/`;
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

export async function deleteConnectsRequest(params: { id: string }): Promise<{
    data: number;
    status?: HttpStatus;
    path: string;
}> {
    const url = `${configs.services.incident.getUrl()}/connects/${params.id}`;
    try {
        const res = await axios.delete<{ number: number }>(url);
        return { data: res.data.number, path: url };
    } catch (e) {
        if (axios.isAxiosError(e) && e.response?.status) {
            return { data: 0, status: e.response?.status, path: url };
        } else {
            throw new HttpError(error.service(url));
        }
    }
}

export async function getConnectsRequest(params: {
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
    const url = `${configs.services.incident.getUrl()}/connects/connect-request?page=${
        params.page
    }&size=${params.size}&sort=${params.sort ? params.sort : ""}&query=${
        params.query ? params.query : ""
    }`;
    console.log("url internal r -> i", url);
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

export async function updateConnectRequest(params: {
    ticketId: string;
    tenantTicket: string;
    incidents: string[];
    userId: string;
}): Promise<{
    data: number;
    status?: HttpStatus;
    path: string;
}> {
    const url = `${configs.services.incident.getUrl()}/connects/`;
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

export async function getTicketNotConnectIncident(params: {
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
    const url = `${configs.services.incident.getUrl()}/tickets/not-connect?query=${
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
