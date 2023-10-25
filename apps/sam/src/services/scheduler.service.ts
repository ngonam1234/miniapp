import { HttpError, error } from "app";
import axios from "axios";
import { configs } from "../configs";
import { CreateJobReqBody } from "../interfaces/request";

export async function createJobs(
    jobs: CreateJobReqBody[]
): Promise<{ body?: { id: string }; status?: number; path: string }> {
    const url = `${configs.services.scheduler.getUrl()}/jobs/schedule`;
    try {
        const res = await axios.post(url, jobs);
        return { body: res.data, status: res.status, path: url };
    } catch (e) {
        if (axios.isAxiosError(e) && e.response?.status) {
            return { status: e.response?.status, path: url };
        } else {
            throw new HttpError(error.service(url));
        }
    }
}

export async function cancelJobs(
    tags: string[]
): Promise<{ body?: unknown; status?: number; path: string }> {
    const url = `${configs.services.scheduler.getUrl()}/jobs/cancel`;
    try {
        const res = await axios.post(url, tags);
        return { body: res.data, status: res.status, path: url };
    } catch (e) {
        if (axios.isAxiosError(e) && e.response?.status) {
            return { status: e.response?.status, path: url };
        } else {
            throw new HttpError(error.service(url));
        }
    }
}
