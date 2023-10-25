export interface CreateJobReqBody {
    tags: string[];
    type: "ONE_TIME" | "RECURRING";
    expression?: string;
    execution_time?: Date;
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
