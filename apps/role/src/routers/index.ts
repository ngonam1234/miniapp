import { Router } from "express";
import { configs } from "../configs";
import { verifyToken } from "../middlewares";

import { router as roleRouter } from "./external/role.router";
import { router as inRoleRouter } from "./internal/role.router";

export const router: Router = Router();

const exPrefix = `${configs.app.prefix}/roles`;
const inPrefix = `${configs.app.prefix}/in/roles`;

router.use(`${exPrefix}`, verifyToken, roleRouter);
router.use(`${inPrefix}`, inRoleRouter);
