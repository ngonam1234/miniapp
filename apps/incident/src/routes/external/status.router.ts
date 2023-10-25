import { Payload, matchedBody, matchedQuery } from "app";
import express, { NextFunction, Request, Response } from "express";
import {
    createStatus,
    findStatus,
    findStatusById,
    updateStatus,
    activationStatus,
    deleteManyStatus,
    deleteStatus,
} from "../../controllers";
import {
    FindReqQuery,
    CreateStatusReqBody,
    UpdateStatusReqBody,
    ValidationReqBody,
} from "../../interfaces/request";
import { verifyRole } from "../../middlewares";
import {
    findValidator,
    createStatusValidator,
    updateStatusValidator,
    activationValidator,
} from "../../validator";

export const router = express.Router();

router.get(
    "/",
    verifyRole("SA", "TA", "L*"),
    findValidator(),
    async (req: Request, _: Response, next: NextFunction) => {
        const query: FindReqQuery = matchedQuery(req);
        const result = await findStatus(query);
        next(result);
    }
);

router.get(
    "/:statusId",
    verifyRole("SA", "TA"),
    async (req: Request, _: Response, next: NextFunction) => {
        const { roles, tenant } = req.payload as Payload;
        const { statusId } = req.params;
        const result = await findStatusById({
            statusId,
            userRoles: roles,
            userTenant: tenant,
        });
        next(result);
    }
);

router.post(
    "/",
    verifyRole("SA", "TA"),
    createStatusValidator(),
    async (req: Request, _: Response, next: NextFunction) => {
        const { roles, id } = req.payload as Payload;
        const body: CreateStatusReqBody = matchedBody(req);
        const tenant = req.query.tenant as string;
        const result = await createStatus({
            ...body,
            userRoles: roles,
            userTenant: tenant,
            userId: id,
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
        const result = await activationStatus({
            ids,
            status,
            userRoles: roles,
            userTenant: tenant,
        });
        next(result);
    }
);

router.put(
    "/:statusId",
    verifyRole("SA", "TA"),
    updateStatusValidator(),
    async (req: Request, _: Response, next: NextFunction) => {
        const { roles, tenant, id } = req.payload as Payload;
        const { statusId } = req.params;
        const body: UpdateStatusReqBody = matchedBody(req);
        const result = await updateStatus({
            ...body,
            statusId,
            userRoles: roles,
            userTenant: tenant,
            userId: id,
        });
        next(result);
    }
);

router.delete(
    "/:statusId",
    verifyRole("SA", "TA"),
    async (req: Request, _: Response, next: NextFunction) => {
        const { roles, tenant } = req.payload as Payload;
        const { statusId } = req.params;
        const result = await deleteStatus({
            statusId,
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
        const result = await deleteManyStatus({
            ids,
            userRoles: roles,
            userTenant: tenant,
        });
        next(result);
    }
);
