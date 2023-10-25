import express, { NextFunction, Request, Response } from "express";
import {
    DoApprovalTaskReqBody,
    DoApprovalManyTaskReqBody,
    CreateTaskReqBody,
    FindTaskReqQuery,
    UpdateTaskReqBody,
} from "../../interfaces/request";
import { Payload, matchedBody, matchedQuery } from "app";
import {
    doApprovalManyTask,
    createTask,
    updateTask,
    doApprovalTask,
    getTaskById,
    getTasks,
    deleteManyTasks,
    deleleTask,
} from "../../controllers/task.controller";

import {
    doApprovalManyTaskValidator,
    doApprovalTaskValidator,
    createTaskValidator,
    findTaskValidator,
    updateTaskValidator,
    deleletManyTasksValidator,
} from "../../validator/task.validator";
import { verifyRole } from "../../middlewares";
export const router = express.Router();

router.get(
    "/:id",
    verifyRole("L1", "L2"),
    async (req: Request, _: Response, next: NextFunction) => {
        const id = req.params.id;
        // const { roles, tenant } = req.payload as Payload;
        const result = await getTaskById({
            id: id,
        });
        next(result);
    }
);

router.get(
    "/",
    verifyRole("L1", "L2"),
    findTaskValidator(),
    async (req: Request, _: Response, next: NextFunction) => {
        const { id, roles, tenant } = req.payload as Payload;
        const ticketId = req.query.ticketId as string;
        const query: FindTaskReqQuery = matchedQuery(req);
        const result = await getTasks({
            ...query,
            userId: id,
            ticketId: ticketId,
            userRoles: roles,
            tenant: tenant as string,
        });
        next(result);
    }
);

router.post(
    "/delete",
    deleletManyTasksValidator(),
    verifyRole("L1", "L2"),
    async (req: Request, _: Response, next: NextFunction) => {
        const { roles, tenant } = req.payload as Payload;
        const { task_ids } = req.body;
        const result = await deleteManyTasks({
            task_ids,
            userRoles: roles,
            tenant: tenant as string,
        });
        next(result);
    }
);

router.delete(
    "/:id",
    verifyRole("L1", "L2"),
    async (req: Request, _: Response, next: NextFunction) => {
        const id = req.params.id;
        const { roles, tenant } = req.payload as Payload;
        const result = await deleleTask({
            task_id: id,
            userRoles: roles,
            tenant: tenant as string,
        });
        next(result);
    }
);

router.post(
    "/do-approval",
    doApprovalManyTaskValidator(),
    verifyRole("L1", "L2"),
    async (req: Request, _: Response, next: NextFunction) => {
        const body: DoApprovalManyTaskReqBody = matchedBody(req);
        const { id, roles, tenant } = req.payload as Payload;
        const result = await doApprovalManyTask({
            ...body,
            userId: id,
            userRoles: roles,
            tenant: tenant as string,
        });
        next(result);
    }
);

router.post(
    "/:ticketId",
    verifyRole("L1", "L2"),
    createTaskValidator(),
    async (req: Request, _: Response, next: NextFunction) => {
        const ticket_id = req.params.ticketId;
        const body: CreateTaskReqBody = matchedBody(req);
        const { id, tenant, roles } = req.payload as Payload;
        const result = await createTask({
            ...body,
            userId: id,
            userRoles: roles,
            tenant: tenant,
            ticket_id: ticket_id,
        });
        next(result);
    }
);

router.put(
    "/:id/do-approval",
    verifyRole("L1", "L2"),
    doApprovalTaskValidator(),
    async (req: Request, _: Response, next: NextFunction) => {
        const task_id = req.params.id;
        const body: DoApprovalTaskReqBody = matchedBody(req);
        const { id, roles, tenant } = req.payload as Payload;
        const result = await doApprovalTask({
            ...body,
            id: task_id,
            userId: id,
            userRoles: roles,
            tenant: tenant as string,
        });
        next(result);
    }
);

router.put(
    "/:id",
    verifyRole("L1", "L2"),
    updateTaskValidator(),
    async (req: Request, _: Response, next: NextFunction) => {
        const body: UpdateTaskReqBody = matchedBody(req);
        const task_id = req.params.id as string;
        const { id, tenant, roles } = req.payload as Payload;
        const result = await updateTask({
            ...body,
            id: task_id,
            tenant: tenant,
            userId: id,
            userRoles: roles,
        });
        next(result);
    }
);
