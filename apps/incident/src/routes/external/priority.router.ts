import { Payload, matchedBody, matchedQuery } from "app";
import express, { NextFunction, Request, Response } from "express";
import {
    activationPriority,
    createPriority,
    deleteManyPriority,
    deletePriority,
    findPriority,
    getPriorityById,
    updatePriority,
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
        const result = await findPriority(query);
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
        const result = await createPriority({
            ...body,
            userRoles: roles,
            userId: id,
            tenant,
        });
        next(result);
    }
);

router.get(
    "/:priorityId",
    verifyRole("SA", "TA"),
    async (req: Request, _: Response, next: NextFunction) => {
        const { roles, tenant } = req.payload as Payload;
        const priorityId = req.params.priorityId as string;
        const result = await getPriorityById({
            priorityId,
            userRoles: roles,
            userTenant: tenant,
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
        const result = await activationPriority({
            ids,
            status,
            userRoles: roles,
            userTenant: tenant,
        });
        next(result);
    }
);

router.put(
    "/:priorityId",
    verifyRole("SA", "TA"),
    updateValidator(),
    async (req: Request, _: Response, next: NextFunction) => {
        const body: UpdateReqBody = req.body;
        const priorityId = req.params.priorityId as string;
        const { id, roles, tenant } = req.payload as Payload;
        const result = await updatePriority({
            priorityId,
            ...body,
            userRoles: roles,
            userId: id,
            tenant,
        });
        next(result);
    }
);

router.delete(
    "/:priorityId",
    verifyRole("SA", "TA"),
    async (req: Request, _: Response, next: NextFunction) => {
        const { roles, tenant } = req.payload as Payload;
        const { priorityId } = req.params;
        const result = await deletePriority({
            priorityId,
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
        const result = await deleteManyPriority({
            ids,
            userRoles: roles,
            userTenant: tenant,
        });
        next(result);
    }
);
