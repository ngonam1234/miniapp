import { error, HttpError, HttpStatus } from "app";
import axios from "axios";
import { configs } from "../configs";
import { FileResBody } from "../interfaces/response";

export async function getDownloadLinks(objects: string[]): Promise<{
    body?: FileResBody[];
    status?: HttpStatus;
    path: string;
}> {
    const url = `${configs.services.file.getUrl()}/download-links`;
    try {
        const res = await axios.post<FileResBody[]>(`${url}`, objects);
        return { body: res.data, path: url, status: res.status };
    } catch (e) {
        if (axios.isAxiosError(e) && e.response?.status) {
            return { status: e.response?.status, path: url };
        } else {
            throw new HttpError(error.service(url));
        }
    }
}
