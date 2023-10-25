import { HttpError, HttpStatus, error } from "app";
import { getTenantByCode } from "./tenant.service";

export async function checkTenantExist(tenant: string): Promise<void> {
    const response = await getTenantByCode(tenant);
    if (response.status === HttpStatus.NOT_FOUND || !response.body) {
        throw new HttpError(
            error.invalidData({
                value: tenant,
                param: "tenant",
                location: "query",
                message: `Tenant ${tenant} does not exists`,
            })
        );
    }

    if (response.body.is_active === false) {
        throw new HttpError(
            error.invalidData({
                value: tenant,
                param: "tenant",
                location: "query",
                message: `Tenant ${tenant} is inactive`,
            })
        );
    }
}
