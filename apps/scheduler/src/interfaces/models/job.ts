export interface IJob {
    id: string;
    tags: string[];
    type: "ONE_TIME" | "RECURRING";
    expression?: string;
    execution_time: Date;
    created_time: Date;
    status: "PENDING" | "SCHEDULED";
    execution: {
        type: "HTTP_REQ";
        http_request: {
            url: string;
            method: "GET" | "POST" | "PUT" | "DELETE";
            headers: {
                name: string;
                value: string;
            }[];
            params: {
                name: string;
                value: string;
            }[];
            data?: string;
        };
    };
}
