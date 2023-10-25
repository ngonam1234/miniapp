import { HttpError, Result, error, success } from "app";
import parser from "cron-parser";
import { v1 } from "uuid";
import { CreateJobReqBody } from "../interfaces";
import Job from "../models/job";
import { cancelJobsScheduled, scheduleJob } from "./scheduler.controller";

export async function createJobs(params: CreateJobReqBody[]): Promise<Result> {
    const promises = params.map((j) => createJob(j));
    await Promise.all(promises);
    return success.created({
        created: params.length,
    });
}

export async function cancelJobs(tags: string[]): Promise<Result> {
    const res = await Job.find({ tags: { $in: tags } })?.lean();
    const jobIds = res?.map((j) => j.id);
    cancelJobsScheduled(jobIds);
    await Job.deleteMany({ id: { $in: jobIds } });
    return success.ok({ deleted: jobIds.length });
}

async function createJob(params: CreateJobReqBody): Promise<void> {
    if (params.type === "ONE_TIME" && !params.execution_time) {
        throw new HttpError(
            error.invalidData({
                param: "execution_time",
                value: params.execution_time,
                message: "'execution_time' is required",
            })
        );
    }
    if (params.type === "RECURRING") {
        if (!params.expression) {
            throw new HttpError(
                error.invalidData({
                    param: "expression",
                    value: params.expression,
                    message: "'expression' is required",
                })
            );
        } else {
            try {
                parser.parseExpression(params.expression);
            } catch (_) {
                throw new HttpError(
                    error.invalidData({
                        param: "expression",
                        value: params.expression,
                        message: "'expression' is invalid syntax",
                    })
                );
            }
        }
    }
    const job = new Job({
        id: v1(),
        type: params.type,
        created_time: new Date(),
        expression: params.expression,
        execution_time: params.execution_time,
        execution: params.execution,
    });
    await scheduleJob(job);
}
