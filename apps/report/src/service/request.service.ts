import { error, HttpError, HttpStatus } from "app";
import axios from "axios";
import { configs } from "../configs";
import { StatusResBody } from "../interfaces/response";

export async function getMyTicketsByStatus(params: {
    userTenant?: string;
    userRoles: string[];
    userId: string;
}): Promise<{
    body?: StatusResBody;
    status?: HttpStatus;
    path: string;
}> {
    const { userTenant, userRoles, userId } = params;
    const url = `${configs.services.request.getUrl()}/tickets/my-tickets`;
    try {
        const res = await axios.get(`${url}`, {
            params: {
                tenant: userTenant,
                roles: userRoles,
                userId,
            },
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

export async function countTicketByStatus(params: {
    userTenant?: string;
    userRoles: string[];
    userId: string;
    startDate?: string;
    endDate?: string;
}): Promise<{
    body?: StatusResBody;
    status?: HttpStatus;
    path: string;
}> {
    const { userTenant, userRoles, userId, startDate, endDate } = params;
    const url = `${configs.services.request.getUrl()}/tickets/count-by-status`;
    try {
        const res = await axios.get(`${url}`, {
            params: {
                tenant: userTenant,
                roles: userRoles,
                userId,
                startDate,
                endDate,
            },
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

export async function countTicketByDate(params: {
    userTenant?: string;
    userRoles: string[];
    userId: string;
    startDate?: string;
    endDate?: string;
}): Promise<{
    body?: StatusResBody;
    status?: HttpStatus;
    path: string;
}> {
    const { userTenant, userRoles, userId, startDate, endDate } = params;
    const url = `${configs.services.request.getUrl()}/tickets/count-by-date`;
    try {
        const res = await axios.get(`${url}`, {
            params: {
                tenant: userTenant,
                roles: userRoles,
                userId,
                startDate,
                endDate,
            },
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

export async function countTicketByDepartment(params: {
    userTenant?: string;
    userRoles: string[];
    userId: string;
    startDate?: string;
    endDate?: string;
    startDatePrew?: string;
    endDatePrew?: string;
}): Promise<{
    body?: StatusResBody;
    status?: HttpStatus;
    path: string;
}> {
    const {
        userTenant,
        userRoles,
        userId,
        startDate,
        endDate,
        startDatePrew,
        endDatePrew,
    } = params;
    const url = `${configs.services.request.getUrl()}/tickets/count-by-department`;
    try {
        const res = await axios.get(`${url}`, {
            params: {
                tenant: userTenant,
                roles: userRoles,
                userId,
                startDate,
                endDate,
                startDatePrew,
                endDatePrew,
            },
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

export async function countTicketByTechnician(params: {
    userTenant?: string;
    userRoles: string[];
    userId: string;
    startDate?: string;
    endDate?: string;
    startDatePrew?: string;
    endDatePrew?: string;
}): Promise<{
    body?: StatusResBody;
    status?: HttpStatus;
    path: string;
}> {
    const {
        userTenant,
        userRoles,
        userId,
        startDate,
        endDate,
        startDatePrew,
        endDatePrew,
    } = params;
    const url = `${configs.services.request.getUrl()}/tickets/count-by-technician`;
    try {
        const res = await axios.get(`${url}`, {
            params: {
                tenant: userTenant,
                roles: userRoles,
                userId,
                startDate,
                endDate,
                startDatePrew,
                endDatePrew,
            },
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
