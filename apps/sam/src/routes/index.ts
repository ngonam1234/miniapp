import { Router } from "express";
import { configs } from "../configs";
import { verifyToken } from "../middlewares";

import { router as slaRouter } from "./external/sla.router";
import { router as inSlaRouter } from "./internal/sla.router";

export const router: Router = Router();
router.use(`${configs.app.prefix}/slas`, verifyToken, slaRouter);
router.use(`${configs.app.prefix}/in/slas`, inSlaRouter);
