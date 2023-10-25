export interface FindUserByEmailReqQuery {
    email: string;
    tenant: string;
}
export interface FindUserByIdAndTenantCodeReqQuery {
    userid: string;
    tenant: string;
}

export interface FindTotalUserReqQuery {
    roles: string;
    is_active: boolean;
    "tenant.code"?: string;
}

export interface FindUsersNotCustomerPortal {
    query?: string;
    sort?: string;
    tenant?: string;
}
