import { Router } from "express";
import { configs } from "../configs";
import { router as jobRouter } from "./job.router";

export const router: Router = Router();

router.use(`${configs.app.prefix}/in/jobs`, jobRouter);
