import { error, HttpError } from "app";
import axios from "axios";
import { configs } from "../configs";
import { GetTenantResBody } from "../interfaces/response";

export async function getTenantByCode(
    tenantCode: string
): Promise<{ body?: GetTenantResBody; status?: number }> {
    const url = `${configs.services.tenant.getUrl()}`;
    try {
        const res = await axios.get<GetTenantResBody>(
            `${url}/${tenantCode}?type=code`
        );
        return { body: res.data };
    } catch (e) {
        if (axios.isAxiosError(e) && e.response?.status) {
            return { status: e.response?.status };
        } else {
            throw new HttpError(error.service(url));
        }
    }
}
