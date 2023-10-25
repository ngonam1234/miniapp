import { Payload, matchedBody, matchedQuery } from "app";
import express, { NextFunction, Request, Response } from "express";
import {
    activationUrgency,
    createUrgency,
    deleteManyUrgency,
    deleteUrgency,
    findUrgency,
    getUrgencyById,
    updateUrgency,
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
        const result = await findUrgency(query);
        next(result);
    }
);

router.get(
    "/:urgencyId",
    verifyRole("SA", "TA"),
    async (req: Request, _: Response, next: NextFunction) => {
        const { roles, tenant } = req.payload as Payload;
        const urgencyId = req.params.urgencyId as string;
        const result = await getUrgencyById({
            urgencyId,
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
        const result = await createUrgency({
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
        const result = await activationUrgency({
            ids,
            status,
            userRoles: roles,
            userTenant: tenant,
        });
        next(result);
    }
);

router.put(
    "/:urgencyId",
    verifyRole("SA", "TA"),
    updateValidator(),
    async (req: Request, _: Response, next: NextFunction) => {
        const body: UpdateReqBody = matchedBody(req);
        const urgencyId = req.params.urgencyId as string;
        const { id, roles, tenant } = req.payload as Payload;
        const result = await updateUrgency({
            urgencyId,
            ...body,
            userRoles: roles,
            userId: id,
            tenant,
        });
        next(result);
    }
);

router.delete(
    "/:urgencyId",
    verifyRole("SA", "TA"),
    async (req: Request, _: Response, next: NextFunction) => {
        const { roles, tenant } = req.payload as Payload;
        const { urgencyId } = req.params;
        const result = await deleteUrgency({
            urgencyId,
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
        const result = await deleteManyUrgency({
            ids,
            userRoles: roles,
            userTenant: tenant,
        });
        next(result);
    }
);
