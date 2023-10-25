export interface GetFieldDataReqQuery {
    module: string;
    field: string;
    query?: string;
    group?: string;
}

export interface FindSlaReqQuery {
    module: string;
    page: number;
    size: number;
    query?: string;
    sort?: string;
}
