import { Router } from "express";
import { configs } from "../configs";
import { verifyToken } from "../middlewares";

import { router as dashboardRouter } from "./external/dashboard.router";

export const router: Router = Router();
router.use(`${configs.app.prefix}/dashboard`, verifyToken, dashboardRouter);
