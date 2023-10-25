export interface Payload {
    id: string;
    roles: string[];
    tenant?: string;
    email: string;
    type: string;
    department?: string;
}

declare module "express-serve-static-core" {
    export interface Request {
        payload?: Payload;
        request_id: string;
        correlation_id?: string;
    }
}

export {};

export * from "./body";
export * from "./query";
