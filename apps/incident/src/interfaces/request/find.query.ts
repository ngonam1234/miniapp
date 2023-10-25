export interface FindReqQuery {
    page: number;
    size: number;
    query?: string;
    sort?: string;
    tenant?: string;
}

export interface CountTicketByStatusReqQuery {
    tenant: string;
    roles: string[];
    userId: string;
}

export interface ExportReqQuery {
    page: number;
    size: number;
    sort: string;
    start: string;
    end: string;
    type: string;
}

export interface FindTicketNotConnectReqQuery {
    page: number;
    size: number;
    query?: string;
    sort?: string;
    type: string;
}
