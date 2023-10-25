import { Payload, matchedBody, matchedQuery } from "app";
import express, { NextFunction, Request, Response } from "express";
import {
    createGroup,
    deleteGroup,
    deleteGroups,
    findGroup,
    getGroupById,
    updateGroup,
} from "../../controllers";
import {
    CreateGroupReqBody,
    UpdateGroupReqBody,
} from "../../interfaces/request";
import { FindReqQuery } from "../../interfaces/request";
import { verifyRole } from "../../middlewares";
import {
    createGroupValidator,
    findGroupValidator,
    updateGroupValidator,
} from "../../validator";

export const router = express.Router();

router.get(
    "/",
    verifyRole("SA", "TA"),
    findGroupValidator(),
    async (req: Request, _: Response, next: NextFunction) => {
        const { roles, id } = req.payload as Payload;
        const query: FindReqQuery = matchedQuery(req);
        const result = await findGroup({
            ...query,
            userId: id,
            userRoles: roles,
        });
        next(result);
    }
);

router.post(
    "/",
    verifyRole("TA", "SA"),
    createGroupValidator(),
    async (req: Request, _: Response, next: NextFunction) => {
        const role = req.payload?.roles as string[];
        const body: CreateGroupReqBody = matchedBody(req);
        const tenant = req.query.tenant as string;
        const result = await createGroup({
            ...body,
            leader_id: body.leader_id,
            userRoles: role,
            tenant,
        });
        next(result);
    }
);

router.post(
    "/deletes",
    verifyRole("TA", "SA"),
    async (req: Request, _: Response, next: NextFunction) => {
        const { tenant, id, roles } = req.payload as Payload;
        const groupIds = req.body.groupIds as string[];
        const result = await deleteGroups({
            groupIds,
            tenant: tenant,
            userRoles: roles,
            userId: id,
        });
        next(result);
    }
);

router.put(
    "/:groupId",
    verifyRole("TA", "SA"),
    updateGroupValidator(),
    async (req: Request, _: Response, next: NextFunction) => {
        const { tenant, id, roles } = req.payload as Payload;
        const { groupId } = req.params;
        const body: UpdateGroupReqBody = matchedBody(req);
        const result = await updateGroup({
            ...body,
            groupId,
            tenant: tenant,
            userRoles: roles,
            userId: id,
        });
        next(result);
    }
);

router.delete(
    "/:groupId",
    verifyRole("TA", "SA"),
    async (req: Request, _: Response, next: NextFunction) => {
        const { tenant, id, roles } = req.payload as Payload;
        const { groupId } = req.params;
        const result = await deleteGroup({
            groupId,
            tenant: tenant,
            userRoles: roles,
            userId: id,
        });
        next(result);
    }
);

router.get(
    "/:groupId",
    verifyRole("TA", "SA"),
    async (req: Request, _: Response, next: NextFunction) => {
        const { tenant, id, roles } = req.payload as Payload;
        const { groupId } = req.params;
        const result = await getGroupById({
            groupId,
            tenant: tenant,
            userRoles: roles,
            userId: id,
        });
        next(result);
    }
);
