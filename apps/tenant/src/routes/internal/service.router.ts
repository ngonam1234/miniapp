import express, { NextFunction, Request, Response, Router } from "express";
import {
    getAllCategory,
    getAllService,
    getAllServiceSubService,
    getAllSubCategory,
    getAllSubService,
    getAllSubServiceL2BySubService,
} from "../../controllers";
export const router: Router = express.Router();

// TODO add validator for all request

router.get("/", async (req: Request, _: Response, next: NextFunction) => {
    const tenant = req.query.tenant as string | undefined;
    const is_active = req.query.is_active as boolean | undefined;
    const result = await getAllService({ tenant, is_active });
    next(result);
});

router.get(
    "/with-subservices",
    async (req: Request, _: Response, next: NextFunction) => {
        const tenant = req.query.tenant as string | undefined;
        const serviceName = req.query.serviceName as string | undefined;
        const result = await getAllServiceSubService({ tenant, serviceName });
        next(result);
    }
);

router.get(
    "/:serviceId?/sub-services",
    async (req: Request, _: Response, next: NextFunction) => {
        const tenant = req.query.tenant as string | undefined;
        const serviceId = req.params.serviceId as string | undefined;
        const result = await getAllSubService({ serviceId, tenant });
        next(result);
    }
);

router.get(
    "/categories/:categoryId?/sub-categories",
    async (req: Request, _: Response, next: NextFunction) => {
        const tenant = req.query.tenant as string | undefined;
        const categoryId = req.params.categoryId as string | undefined;
        const result = await getAllSubCategory({ categoryId, tenant });
        next(result);
    }
);

router.get(
    "/:serviceId?/categories",
    async (req: Request, _: Response, next: NextFunction) => {
        const tenant = req.query.tenant as string | undefined;
        const serviceId = req.params.serviceId as string | undefined;
        const result = await getAllCategory({ serviceId, tenant });
        next(result);
    }
);

router.get(
    "/sub-services/:subServiceId?/sub-services-l2",
    async (req: Request, _: Response, next: NextFunction) => {
        const tenant = req.query.tenant as string | undefined;
        const subServiceId = req.params.subServiceId as string | undefined;
        const result = await getAllSubServiceL2BySubService({
            subServiceId,
            tenant,
        });
        next(result);
    }
);
