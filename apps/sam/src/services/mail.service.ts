import { HttpError, HttpStatus, error } from "app";
import axios from "axios";
import { resolveValue } from "utils";
import { configs } from "../configs";
import { getUserByIds } from "./user.service";

type SendMailBody = {
    code: string;
    emails: string[];
    groups: string[];
    service_name: string;
    info: {
        IDTicket: string;
        Subject: string;
        TicketLink: string;
        Service?: string;
        Priority?: string;
        Due_date?: string;
        ResponseDueByTime?: string;
        GroupName?: string;
        Tech?: string;
    };
};

export async function sendSlaNotification(params: {
    ticket: object;
    module: string;
    templateCode: "T007" | "T008" | "T009" | "T010";
    resOverdueTime?: Date;
    revOverdueTime?: Date;
    receivers?: {
        recipient: string;
        type: "PEOPLE" | "GROUP";
    }[];
}): Promise<{
    body?: unknown;
    status: HttpStatus;
    path: string;
}> {
    const ticketId = resolveValue(params.ticket, "id");
    const ticketNumber = resolveValue(params.ticket, "number");
    const priority = resolveValue(params.ticket, "priority.name");
    const service = resolveValue(params.ticket, "service.name");
    const emailTech = resolveValue(params.ticket, "technician.email");
    const body: SendMailBody = {
        code: params.templateCode,
        service_name: configs.service,
        emails: [],
        groups: [],
        info: {
            IDTicket: String(ticketNumber),
            Subject: String(service),
            Priority: priority ? String(priority) : undefined,
            TicketLink: `https://dev-ca.vnest.vn/request/ticket/${ticketId}`,
            Due_date: params.revOverdueTime?.toLocaleString(),
            ResponseDueByTime: params.resOverdueTime?.toLocaleString(),
        },
    };
    switch (params.templateCode) {
        case "T007":
        case "T008": {
            emailTech && body.emails.push(String(emailTech));
            break;
        }
        case "T009":
        case "T010": {
            const userIds: string[] = [];
            const groupIds: string[] = [];
            for (const receiver of params?.receivers ?? []) {
                if (receiver.type === "GROUP") {
                    groupIds.push(receiver.recipient);
                } else if (receiver.type === "PEOPLE") {
                    userIds.push(receiver.recipient);
                }
            }
            body.groups.push(...groupIds);
            if (userIds.length) {
                const users = await getUserByIds(userIds);
                const emails = users.body?.map((u) => u.email);
                emails && body.emails.push(...emails);
            }
            break;
        }
        default: {
            throw new Error("Invalid template code");
        }
    }

    const url = `${configs.services.mail.getUrl()}/send-sla`;
    try {
        const res = await axios.post(url, body);
        return { body: res.data, path: url, status: res.status };
    } catch (e) {
        if (axios.isAxiosError(e) && e.response?.status) {
            return { status: e.response?.status, path: url };
        } else {
            throw new HttpError(error.service(url));
        }
    }
}
