import axios from "axios";
import { error, HttpError, HttpStatus } from "app";
import { configs } from "../configs";
// import FormData from "form-data";
import logger from "logger";
import FormData from "form-data";
import https from "https";

const agent = new https.Agent({
    rejectUnauthorized: false,
});

export async function sendMailTenten(params: {
    subject: string;
    fromName: string;
    text: string;
    to: string;
}): Promise<{
    body?: {
        message: {
            Data: number;
            Success: string;
        };
    };
    status?: HttpStatus;
    path: string;
}> {
    const url = `${configs.tenten.url}`;
    try {
        const data = new FormData();
        data.append("Subject", params.subject);
        data.append("FromName", params.fromName);
        data.append("FromAddress", configs.tenten.from as string);
        data.append("ReplyTo", configs.tenten.reply as string);
        data.append("HTMLBody", params.text);
        data.append("token", configs.tenten.token as string);
        data.append("ToAddress", params.to);
        const headers = {
            Cookie: configs.tenten.cookie,
            ...data.getHeaders(),
        };
        const config = {
            method: "post",
            maxBodyLength: Infinity,
            url,
            headers,
            data: data,
            httpsAgent: agent,
        };
        const res = await axios.request(config);
        return { body: res.data, path: url, status: res.status };
    } catch (e) {
        throw new HttpError(error.service(url));
    }
}
