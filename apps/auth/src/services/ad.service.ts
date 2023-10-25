import { HttpError, HttpStatus, error } from "app";
import axios from "axios";
import logger from "logger";
import {
    VerifyCodeResBody,
    VerifyKeyCloakResBody,
} from "../interfaces/response";
import { configs } from "./../configs";

export async function verifyAccessCode(params: {
    accessCode: string;
}): Promise<{ body?: VerifyCodeResBody; status?: number }> {
    const url = `${configs.services.ad.getUrl()}`;
    try {
        const res = await axios.post<VerifyCodeResBody>(`${url}verify`, params);
        return { body: res.data };
    } catch (e) {
        if (axios.isAxiosError(e) && e.response?.status) {
            return { status: e.response?.status };
        } else {
            throw new HttpError(error.service(url));
        }
    }
}

export async function verifyKeyCloak(params: {
    code: string;
    redirect_uri: string;
    session_state: string;
    grant_type: string;
    client_id: string;
}): Promise<{
    body?: VerifyKeyCloakResBody;
    status?: HttpStatus;
    path: string;
}> {
    // logger.info("params %o", params)
    const url = `${configs.services.keycloak.getUrl()}`;
    const headers = {
        "Content-Type": "application/x-www-form-urlencoded",
    };
    const data = new URLSearchParams();
    data.append("grant_type", params.grant_type);
    data.append("client_id", params.client_id);
    data.append(
        "client_secret",
        configs.services.keycloak.client_secret as string
    );
    data.append("code", params.code);
    data.append("redirect_uri", params.redirect_uri);
    data.append("session_state", params.session_state);

    try {
        const res = await axios.post<VerifyKeyCloakResBody>(`${url}`, data, {
            headers,
        });
        return { body: res.data, path: url, status: res.status };
    } catch (e) {
        if (axios.isAxiosError(e) && e.response?.status) {
            logger.info("error %o", e.response.data);
            return {
                status: e.response?.status,
                path: url,
            };
        } else {
            throw new HttpError(error.service(url));
        }
    }
}
