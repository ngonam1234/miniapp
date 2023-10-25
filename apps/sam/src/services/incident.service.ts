import { HttpError, HttpStatus, error } from "app";
import axios from "axios";
import { configs } from "../configs";
import { ISlaUpdatingField } from "../interfaces/model";

export async function updateTicketIncident(params: {
    ticketId: string;
    updateFields?: ISlaUpdatingField[];
    sla?: object;
}): Promise<{
    body?: unknown;
    status: HttpStatus;
    path: string;
}> {
    const fields = params.updateFields?.reduce(
        (a, i) => ({ ...a, [i.field.name]: i.value }),
        {}
    );
    const url = `${configs.services.request.getUrl()}/tickets/${
        params.ticketId
    }`;
    try {
        const res = await axios.put(url, { fields, sla: params.sla });
        return { body: res.data, path: url, status: res.status };
    } catch (e) {
        if (axios.isAxiosError(e) && e.response?.status) {
            return { status: e.response?.status, path: url };
        } else {
            throw new HttpError(error.service(url));
        }
    }
}

export async function getTicketIncident(id: string): Promise<{
    body?: unknown;
    status: HttpStatus;
    path: string;
}> {
    const url = `${configs.services.incident.getUrl()}/tickets/${id}`;
    try {
        const res = await axios.get(url);
        return { body: res.data, path: url, status: res.status };
    } catch (e) {
        if (axios.isAxiosError(e) && e.response?.status) {
            return { status: e.response?.status, path: url };
        } else {
            throw new HttpError(error.service(url));
        }
    }
}
