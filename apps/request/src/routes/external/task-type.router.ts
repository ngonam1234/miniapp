import { Payload, matchedBody, matchedQuery } from "app";
import express, { NextFunction, Request, Response } from "express";
import {
    createTaskType,
    deleteTaskType,
    deleteManyTaskTypes,
    getTaskTypeById,
    getTaskTypes,
    updateTaskType,
} from "../../controllers/task-type.controller";
import {
    CreateTaskTypeBody,
    UpdateTaskTypeBody,
} from "../../interfaces/request/task-type.body";
import { verifyRole } from "../../middlewares";
import { updateTaskTypeValidator } from "../../validator/task-type.validator";
import { createValidator, findValidator } from "../../validator";
import { FindReqQuery } from "../../interfaces/request";
export const router = express.Router();

router.get(
    "/",
    findValidator(),
    verifyRole("SA", "TA"),
    async (req: Request, _: Response, next: NextFunction) => {
        const { id, roles, tenant } = req.payload as Payload;
        const query: FindReqQuery = matchedQuery(req);
        const result = await getTaskTypes({
            ...query,
            userId: id,
            userRoles: roles,
            userTenant: tenant,
        });
        next(result);
    }
);

router.get(
    "/:id",
    verifyRole("SA", "TA"),
    async (req: Request, _: Response, next: NextFunction) => {
        const { tenant, roles } = req.payload as Payload;
        const { id } = req.params;
        const result = await getTaskTypeById({
            id: id,
            userTenant: tenant,
            userRoles: roles,
        });
        next(result);
    }
);

router.delete(
    "/:id",
    verifyRole("SA", "TA"),
    async (req: Request, _: Response, next: NextFunction) => {
        const { roles, tenant } = req.payload as Payload;
        const { id } = req.params;
        const result = await deleteTaskType({
            id: id,
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
        const body: CreateTaskTypeBody = matchedBody(req);
        const tenant = req.query.tenant as string;
        const result = await createTaskType({
            ...body,
            tenant: tenant,
        });
        next(result);
    }
);

router.post(
    "/delete-many",
    verifyRole("SA", "TA"),
    async (req: Request, _: Response, next: NextFunction) => {
        const { ids } = req.body;
        const { roles, tenant } = req.payload as Payload;
        const result = await deleteManyTaskTypes({
            ids,
            userRoles: roles,
            userTenant: tenant,
        });
        next(result);
    }
);

router.put(
    "/:id",
    verifyRole("SA", "TA"),
    updateTaskTypeValidator(),
    async (req: Request, _: Response, next: NextFunction) => {
        const { id, roles, tenant } = req.payload as Payload;
        const body: UpdateTaskTypeBody = matchedBody(req);
        const taskTypeId = req.params.id as string;
        const result = await updateTaskType({
            ...body,
            taskTypeId,
            userId: id,
            userRoles: roles,
            userTenant: tenant,
        });
        next(result);
    }
);
