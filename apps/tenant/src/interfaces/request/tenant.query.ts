export interface FindTenantReqQuery {
    size: number;
    page: number;
    query?: string;
    sort?: string;
    tenant?: string;
}
