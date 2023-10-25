import axios, { AxiosError } from "axios";
import { IJob } from "../interfaces";
import { document } from "../models";
import { scheduleJob } from "./scheduler.controller";

export async function executeJob(job: document<IJob>): Promise<void> {
    const httpRequest = job.execution.http_request;
    const headers = httpRequest.headers.reduce(
        (a, i) => ({ ...a, [i.name]: i.value }),
        {}
    );
    const params = httpRequest.params.reduce(
        (a, i) => ({ ...a, [i.name]: i.value }),
        {}
    );

    try {
        const res = await axios({
            url: httpRequest.url,
            method: httpRequest.method,
            data: httpRequest.data,
            headers: headers,
            params: params,
        });
        console.log(res.data, httpRequest.data);
    } catch (error) {
        const err = error as AxiosError;
        console.log(err.response?.data);
    }
    if (job.type === "RECURRING") {
        await scheduleJob(job);
    } else {
        await job.deleteOne();
    }
}
