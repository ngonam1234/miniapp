import { Payload, matchedBody, matchedQuery } from "app";
import express, { NextFunction, Request, Response } from "express";
import {
    activationImpact,
    createImpact,
    deleteManyImpact,
    deleteImpact,
    findImpact,
    getImpactById,
    updateImpact,
} from "../../controllers";
import {
    CreateReqBody,
    FindReqQuery,
    UpdateReqBody,
    ValidationReqBody,
} from "../../interfaces/request";
import { verifyRole } from "../../middlewares";
import {
    activationValidator,
    createValidator,
    findValidator,
    updateValidator,
} from "../../validator";

export const router = express.Router();

router.get(
    "/",
    verifyRole("SA", "TA"),
    findValidator(),
    async (req: Request, _: Response, next: NextFunction) => {
        const query: FindReqQuery = matchedQuery(req);
        const result = await findImpact(query);
        next(result);
    }
);

router.get(
    "/:impactId",
    verifyRole("SA", "TA"),
    async (req: Request, _: Response, next: NextFunction) => {
        const { roles, tenant } = req.payload as Payload;
        const impactId = req.params.impactId as string;
        const result = await getImpactById({
            impactId,
            userRoles: roles,
            userTenant: tenant,
        });
        next(result);
    }
);

router.post(
    "/",
    verifyRole("SA", "TA"),
    createValidator(),
    async (req: Request, _: Response, next: NextFunction) => {
        const { id, roles } = req.payload as Payload;
        const body: CreateReqBody = matchedBody(req);
        const tenant = req.query.tenant as string;
        const result = await createImpact({
            ...body,
            userRoles: roles,
            userId: id,
            tenant,
        });
        next(result);
    }
);

router.put(
    "/activation",
    verifyRole("SA", "TA"),
    activationValidator(),
    async (req: Request, _: Response, next: NextFunction) => {
        const { roles, tenant } = req.payload as Payload;
        const { ids, status }: ValidationReqBody = req.body;
        const result = await activationImpact({
            ids,
            status,
            userRoles: roles,
            userTenant: tenant,
        });
        next(result);
    }
);

router.put(
    "/:impactId",
    verifyRole("SA", "TA"),
    updateValidator(),
    async (req: Request, _: Response, next: NextFunction) => {
        const body: UpdateReqBody = matchedBody(req);
        const impactId = req.params.impactId as string;
        const { id, roles, tenant } = req.payload as Payload;
        const result = await updateImpact({
            impactId,
            ...body,
            userRoles: roles,
            userId: id,
            tenant,
        });
        next(result);
    }
);

router.delete(
    "/:impactId",
    verifyRole("SA", "TA"),
    async (req: Request, _: Response, next: NextFunction) => {
        const { roles, tenant } = req.payload as Payload;
        const { impactId } = req.params;
        const result = await deleteImpact({
            impactId,
            userRoles: roles,
            userTenant: tenant,
        });
        next(result);
    }
);

router.post(
    "/delete-many",
    verifyRole("SA", "TA"),
    async (req: Request, _: Response, next: NextFunction) => {
        const { roles, tenant } = req.payload as Payload;
        const { ids } = req.body;
        const result = await deleteManyImpact({
            ids,
            userRoles: roles,
            userTenant: tenant,
        });
        next(result);
    }
);
