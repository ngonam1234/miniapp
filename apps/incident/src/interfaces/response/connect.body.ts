export interface ConnectResBody {
    number: number;
    message: string;
}

export interface ConnectBody {
    page: number;
    total: number;
    total_page: number;
    data: TicketConnect[];
}

export interface TicketConnect {
    id: string;
    name: string;
    status: string;
    priority: string;
    technician: string;
    group: string;
    resolution: string;
}
