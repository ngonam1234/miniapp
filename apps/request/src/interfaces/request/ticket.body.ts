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
export type CreateManyTicketReqBody = CreateTicketReqBodyIn[];

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

export interface UpdateTicketStatusReqBody {
    status: string;
    note?: string;
}

export interface UpdateResolutionReqBody {
    solution: {
        content?: string;
        attachments?: string[];
    };
}

export interface ImportTicketBody {
    name: string;
    description: string;
    requester?: string;
    fields: {
        [key: string]: string;
    };
}
export type ImportTicketsBody = ImportTicketBody[];
