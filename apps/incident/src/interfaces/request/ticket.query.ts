export interface FindTicketWithAdvancedFilterReqQuery {
    page: number;
    size: number;
    query?: string;
    sort?: string;
    start?: string;
    end?: string;
    type?: string;

    sla?: string;
    departments?: string[];
    requesters?: string[];
    services?: string[];
    types?: string[];
    priorities?: string[];
    groups?: string[];
    technicians?: string[];
    response_assurance?: string;
    resolving_assurance?: string;
}

export interface ExportTicketSLAReqQuery {
    start: string;
    end: string;
    type: string;
    file: string;

    sla?: boolean;
    departments?: string[];
    requesters?: string[];
    services?: string[];
    types?: string[];
    priorities?: string[];
    groups?: string[];
    technicians?: string[];
    response_assurance?: boolean;
    resolving_assurance?: boolean;
}

export interface ExportTicketReqQuery {
    start: string;
    end: string;
    type: string;
    file: string;

    departments?: string[];
    requesters?: string[];
    services?: string[];
    types?: string[];
    priorities?: string[];
    groups?: string[];
    technicians?: string[];
    response_assurance?: string;
    resolving_assurance?: string;
}