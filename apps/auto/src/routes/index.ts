import { Router } from "express";
import { configs } from "../configs";
import { router as autoRouter } from "./external/auto.router";
import { router as autoRouterIn } from "./internal/auto.router";
import { verifyToken } from "../middlewares";
export const router: Router = Router();

router.use(`${configs.app.prefix}/auto`, verifyToken, autoRouter);
router.use(`${configs.app.prefix}/in/auto`, autoRouterIn);
