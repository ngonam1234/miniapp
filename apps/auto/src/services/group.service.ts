import axios from "axios";
import { configs } from "../configs";
import { HttpError, HttpStatus, error } from "app";
import {
    GetGroupResBody,
    GetUserResBody,
    GroupInfoResBody,
    GroupResBody,
} from "../interfaces/response";

export async function getMembersOfGroup(params: { group: string, tenant: string }): Promise<{
    body?: GroupResBody[];
    status?: HttpStatus;
    path: string;
}> {
    const url = `${configs.services.group.getUrl()}/${params.group}/members`;
    try {
        const res = await axios.get<GroupResBody[]>(url, {
            params: { tenant: params.tenant },
        });
        return { body: res.data, path: url };
    } catch (e) {
        if (axios.isAxiosError(e) && e.response?.status) {
            return { status: e.response?.status, path: url };
        } else {
            throw new HttpError(error.service(url));
        }
    }
}

export async function getGroupByIdInfo(params: {
    tenant: string;
    group: string;
}): Promise<{
    body?: GroupInfoResBody;
    status?: HttpStatus;
    path: string;
}> {
    const url = `${configs.services.group.getUrl()}/${params.group}/`;
    try {
        const res = await axios.get<GroupInfoResBody>(url);
        return { body: res.data, path: url };
    } catch (e) {
        if (axios.isAxiosError(e) && e.response?.status) {
            return { status: e.response?.status, path: url };
        } else {
            throw new HttpError(error.service(url));
        }
    }
}
export async function getGroups(params: {
    tenant: string;
    is_active: boolean;
}): Promise<{
    body?: GetGroupResBody;
    status?: HttpStatus;
    path: string;
}> {
    const url = `${configs.services.group.getUrl()}`;
    try {
        const res = await axios.get<GetGroupResBody>(url, { params });
        return { body: res.data, path: url };
    } catch (e) {
        if (axios.isAxiosError(e) && e.response?.status) {
            return { status: e.response?.status, path: url };
        } else {
            throw new HttpError(error.service(url));
        }
    }
}

// export async function getMembersOfGroup(params: {
//     tenant: string;
//     group: string;
// }): Promise<{
//     body?: GetUserResBody;
//     status?: HttpStatus;
//     path: string;
// }> {
//     let url = `${configs.services.group.getUrl()}`;
//     url = `${url}/${params.group}/members`;
//     try {
//         const res = await axios.get(url, {
//             params: { tenant: params.tenant },
//         });
//         return { body: res.data, path: url };
//     } catch (e) {
//         if (axios.isAxiosError(e) && e.response?.status) {
//             return { status: e.response?.status, path: url };
//         } else {
//             throw new HttpError(error.service(url));
//         }
//     }
// }
