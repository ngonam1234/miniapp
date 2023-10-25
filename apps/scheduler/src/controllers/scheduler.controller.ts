import parser from "cron-parser";
import { configs } from "../configs";
import { IJob } from "../interfaces";
import { document } from "../models";
import Job from "../models/job";
import { executeJob } from "./executor.controller";

let schedulerInterval: number;
if (!isNaN(Number(configs.schedulerInterval))) {
    schedulerInterval = Number(configs.schedulerInterval);
    if (schedulerInterval <= 0) {
        throw new Error("CA_SCHEDULER_INTERVAL must be greater than zero");
    }
} else {
    throw new Error("CA_SCHEDULER_INTERVAL must be integer");
}

const timeoutMap: Map<string, NodeJS.Timeout> = new Map();

export async function scheduleJobsIfNeeded(): Promise<void> {
    setInterval(scheduleJobsIfNeeded2, schedulerInterval - 1000);
    const startTime = new Date();
    const endTime = new Date();
    endTime.addMillisecond(schedulerInterval);
    const jobs = await Job.find({
        $or: [
            {
                type: "ONE_TIME",
                execution_time: {
                    $gte: startTime,
                    $lte: endTime,
                },
            },
            { type: "RECURRING" },
        ],
    });
    const promises = jobs.map((j) => scheduleJob(j));
    await Promise.all(promises);
}

async function scheduleJobsIfNeeded2(): Promise<void> {
    const startTime = new Date();
    const endTime = new Date();
    endTime.addMillisecond(schedulerInterval);
    const jobs = await Job.find({
        status: "PENDING",
        execution_time: {
            $gte: startTime,
            $lte: endTime,
        },
    });
    const promises = jobs.map((j) => scheduleJob(j));
    await Promise.all(promises);
}

export async function scheduleJob(job: document<IJob>): Promise<void> {
    if (job.type === "ONE_TIME") {
        const timestamp = job.execution_time.getTime();
        const timeout = timestamp - Date.now();
        if (timeout < schedulerInterval && timeout > 0) {
            job.status = "SCHEDULED";
            const to = setTimeout(() => executeJob(job), timeout);
            timeoutMap.set(job.id, to);
        }
        await job.save();
    } else if (job.type === "RECURRING" && job.expression) {
        const expr = parser.parseExpression(job.expression);
        job.execution_time = expr.next().toDate();
        const timestamp = job.execution_time.getTime();
        const timeout = timestamp - Date.now();
        if (timeout < schedulerInterval && timeout > 0) {
            job.status = "SCHEDULED";
            const to = setTimeout(() => executeJob(job), timeout);
            timeoutMap.set(job.id, to);
        } else {
            job.status = "PENDING";
        }
        await job.save();
    }
}

export function cancelJobsScheduled(jobIds: string[]): void {
    for (const id of jobIds) {
        const timeout = timeoutMap.get(id);
        timeout && clearTimeout(timeout);
        timeoutMap.delete(id);
    }
}
