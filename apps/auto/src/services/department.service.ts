import { HttpError, HttpStatus, error } from "app";
import { GetDepartmentsResBody } from "../interfaces/response";
import { configs } from "../configs";
import axios from "axios";

export async function getDepartments(params: { tenant: string }): Promise<{
    body?: GetDepartmentsResBody[];
    status?: HttpStatus;
    path: string;
}> {
    const url = `${configs.services.department.getUrl()}?tenant=${
        params.tenant
    }`;
    try {
        const res = await axios.get<GetDepartmentsResBody[]>(url);
        return { body: res.data, path: url };
    } catch (e) {
        if (axios.isAxiosError(e) && e.response?.status) {
            return { status: e.response?.status, path: url };
        } else {
            throw new HttpError(error.service(url));
        }
    }
}
