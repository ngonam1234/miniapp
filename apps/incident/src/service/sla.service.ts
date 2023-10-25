import { HttpError, HttpStatus, error } from "app";
import axios from "axios";
import { configs } from "../configs";
import { ITicket } from "../interfaces/models";
import { FindMatchingSLAResBody } from "../interfaces/response";

export async function findMatchingSlaForTicket(ticket: ITicket): Promise<{
    body?: FindMatchingSLAResBody;
    status?: HttpStatus;
    path: string;
}> {
    const url = `${configs.services.sla.getUrl()}/match`;
    try {
        const res = await axios.post(url, ticket, {
            params: { module: "INCIDENT" },
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

export async function calculateSlaForTicket(ticket: ITicket): Promise<{
    body?: FindMatchingSLAResBody;
    status?: HttpStatus;
    path: string;
}> {
    const url = `${configs.services.sla.getUrl()}/calculate`;
    try {
        const res = await axios.post(url, ticket);
        return { body: res.data, path: url };
    } catch (e) {
        if (axios.isAxiosError(e) && e.response?.status) {
            return { status: e.response?.status, path: url };
        } else {
            throw new HttpError(error.service(url));
        }
    }
}
