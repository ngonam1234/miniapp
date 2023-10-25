import { validate } from "app";
import { NextFunction, Request, Response, Router } from "express";
import { cancelJobs, createJobs } from "../controllers";
import { CreateJobReqBody } from "../interfaces";
import { cancelJobsSchema, createJobsSchema } from "../validators";

export const router: Router = Router();

router.post(
    "/schedule",
    validate.body(createJobsSchema),
    async (req: Request, _: Response, next: NextFunction) => {
        const body: CreateJobReqBody[] = req.body;
        const result = await createJobs(body);
        next(result);
    }
);

router.post(
    "/cancel",
    validate.body(cancelJobsSchema),
    async (req: Request, _: Response, next: NextFunction) => {
        const tags: string[] = req.body;
        const result = await cancelJobs(tags);
        next(result);
    }
);
