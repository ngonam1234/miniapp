export interface SearchDashboardReqQuery {
    name: string;
    type: string;
}

export interface TicketReqQuery {
    startDate?: string;
    endDate?: string;
    startDatePrew?: string;
    endDatePrew?: string;
}
