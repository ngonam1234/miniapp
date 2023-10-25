export interface CreateJobReqBody {
    owner: string;
    type: "RECURRING" | "ONE_TIME";
    execution_time: Date;
    execution: {
        type: "HTTP_REQ";
        http_request: {
            url: string;
            method: string;
            headers?: { name: string; value: string }[];
            params?: { name: string; value: string }[];
            data?: string;
        };
    };
}
