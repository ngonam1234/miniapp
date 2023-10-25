import { Router } from "express";
import { configs } from "../configs";
import { verifyToken } from "../middlewares";

import { router as tenantRouter } from "./external/tenant.router";
import { router as serviceRouter } from "./external/service.router";
import { router as inServiceRouter } from "./internal/service.router";
import { router as categoryRouter } from "./external/category.router";
import { router as inTenantRouter } from "./internal/tenant.router";
import { router as inDepartmentRouter } from "./internal/department.router";
import { router as departmentRouter } from "./external/department.router";

export const router: Router = Router();

router.use(`${configs.app.prefix}/in/departments`, inDepartmentRouter);
router.use(`${configs.app.prefix}/departments`, verifyToken, departmentRouter);
router.use(`${configs.app.prefix}/tenants`, verifyToken, tenantRouter);
router.use(`${configs.app.prefix}/services`, verifyToken, serviceRouter);
router.use(`${configs.app.prefix}/in/services`, inServiceRouter);
router.use(`${configs.app.prefix}/categories`, verifyToken, categoryRouter);
router.use(`${configs.app.prefix}/in/tenants`, inTenantRouter);
