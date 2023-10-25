import { Payload, matchedBody, matchedQuery } from "app";
import express, { NextFunction, Request, Response } from "express";

import { verifyRole } from "../../middlewares";
import {
    activationValidator,
    createValidator,
    findValidator,
    updateValidator,
} from "../../validator";
import {
    CreateReqBody,
    FindReqQuery,
    UpdateReqBody,
    ValidationReqBody,
} from "../../interfaces/request";
import {
    activationType,
    createType,
    deleteManyType,
    deleteType,
    findType,
    getTypeById,
    updateType,
} from "../../controllers";

export const router = express.Router();

router.get(
    "/",
    verifyRole("SA", "TA"),
    findValidator(),
    async (req: Request, _: Response, next: NextFunction) => {
        const query: FindReqQuery = matchedQuery(req);
        const result = await findType(query);
        next(result);
    }
);

router.get(
    "/:typeId",
    verifyRole("SA", "TA"),
    async (req: Request, _: Response, next: NextFunction) => {
        const { roles, tenant } = req.payload as Payload;
        const typeId = req.params.typeId as string;
        const result = await getTypeById({
            typeId,
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
        const result = await createType({
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
        const result = await activationType({
            ids,
            status,
            userRoles: roles,
            userTenant: tenant,
        });
        next(result);
    }
);

router.put(
    "/:typeId",
    verifyRole("SA", "TA"),
    updateValidator(),
    async (req: Request, _: Response, next: NextFunction) => {
        const body: UpdateReqBody = matchedBody(req);
        const typeId = req.params.typeId as string;
        const { id, roles, tenant } = req.payload as Payload;
        const result = await updateType({
            typeId: typeId,
            ...body,
            userRoles: roles,
            userId: id,
            tenant,
        });
        next(result);
    }
);

router.delete(
    "/:typeId",
    verifyRole("SA", "TA"),
    async (req: Request, _: Response, next: NextFunction) => {
        const { roles, tenant } = req.payload as Payload;
        const { typeId } = req.params;
        const result = await deleteType({
            typeId,
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
        const result = await deleteManyType({
            ids,
            userRoles: roles,
            userTenant: tenant,
        });
        next(result);
    }
);
