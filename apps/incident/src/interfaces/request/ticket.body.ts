import { FindMatchingSLAResBody } from "../response";

export interface CreateTicketReqBody {
    name: string;
    description: string;
    requester?: string;
    template: string;
    attachments: string[];
    fields: {
        [key: string]: string;
    };
}

export interface CreateTicketReqBodyIn {
    tenant: string;
    creator: string;
    name: string;
    description: string;
    requester?: string;
    template: string;
    attachments: string[];
    date: string;
    fields: {
        [key: string]: string;
    };
}

export interface CommentTicketReqBody {
    id: string;
    reply_comment?: string;
    content: string;
    attachments?: string[];
    created_time: Date;
    is_view_eu: boolean;
    creator: object;
}

export interface EditCommentTicketReqBody {
    id: string;
    id_comment: string;
    content: string;
    attachments?: string[];
    is_view_eu?: boolean;
}

export interface UpdateTicketReqBody {
    name?: string;
    description?: string;
    attachments?: string[];
    requester?: string;
    note?: string;
    fields?: {
        [key: string]: string;
    };
}

export type UpdateTicketInReqBody = UpdateTicketReqBody & {
    sla?: FindMatchingSLAResBody;
};

export interface UpdateStatusReqBody {
    status: string;
    note?: string;
}

export interface UpdateResolutionReqBody {
    cause?: {
        content?: string;
        attachments?: string[];
    };
    solution?: {
        content?: string;
        attachments?: string[];
    };
}

export interface ValidationReqBody {
    ids: string[];
    status: boolean;
}
