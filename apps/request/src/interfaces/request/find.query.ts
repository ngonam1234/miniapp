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
    startDate?: string;
    endDate?: string;
    startDatePrew?: string;
    endDatePrew?: string;
}

export interface ExportReqQuery {
    page: number;
    size: number;
    sort: string;
    start: string;
    end: string;
    type: string;
}
