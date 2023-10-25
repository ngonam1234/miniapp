import { error, matchedBody, matchedQuery } from "app";
import express, { NextFunction, Request, Response } from "express";
import {
    createTenant,
    findTenant,
    getTenantBy,
    updateActivation,
    updateTenant,
} from "../../controllers";
import {
    CreateTenantReqBody,
    FindTenantReqQuery,
    UpdateActivationReqBody,
    UpdateTenantReqBody,
} from "../../interfaces/request";
import { verifyRole } from "../../middlewares";
import {
    createTenantValidator,
    findTenantValidator,
    updateActivationValidator,
    updateTenantValidator,
} from "../../validator";

export const router = express.Router();

router.get(
    "/",
    verifyRole("SA"),
    findTenantValidator(),
    async (req: Request, _: Response, next: NextFunction) => {
        const query: FindTenantReqQuery = matchedQuery(req);
        const result = await findTenant(query);
        next(result);
    }
);

router.post(
    "/",
    verifyRole("SA"),
    createTenantValidator(),
    async (req: Request, _: Response, next: NextFunction) => {
        const body: CreateTenantReqBody = matchedBody(req);
        const result = await createTenant(body);
        next(result);
    }
);

router.all("/", (req, _, next) => {
    next(error.methodNotAllowed(req.method));
});

router.post(
    "/update-activation",
    verifyRole("SA"),
    updateActivationValidator(),
    async (req: Request, _: Response, next: NextFunction) => {
        const body: UpdateActivationReqBody = matchedBody(req);
        const result = await updateActivation(body);
        next(result);
    }
);

router.put(
    "/:tenantKey",
    verifyRole("SA"),
    updateTenantValidator(),
    async (req: Request, _: Response, next: NextFunction) => {
        const body: UpdateTenantReqBody = matchedBody(req);
        const { tenantKey } = req.params;
        const { type } = req.query;
        const result = await updateTenant({
            key: tenantKey as string,
            type: type as string,
            ...body,
        });
        next(result);
    }
);

router.get(
    "/:tenantKey",
    verifyRole("SA"),
    async (req: Request, _: Response, next: NextFunction) => {
        const { type } = req.query;
        const { tenantKey } = req.params;
        const result = await getTenantBy({
            type: type as string,
            key: tenantKey as string,
        });
        next(result);
    }
);

router.all("/:tenantKey", (req, _, next) => {
    next(error.methodNotAllowed(req.method));
});
