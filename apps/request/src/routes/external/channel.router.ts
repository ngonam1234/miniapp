import { Payload, matchedBody, matchedQuery } from "app";
import express, { NextFunction, Request, Response } from "express";
import {
    activationChannel,
    createChannel,
    deleteChannel,
    deleteManyChannel,
    findChannel,
    getChannelById,
    updateChannel,
} from "../../controllers";
import {
    CreateReqBody,
    FindReqQuery,
    UpdateReqBody,
    UpdateActivationReqBody,
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
        const result = await findChannel(query);
        next(result);
    }
);

router.get(
    "/:channelId",
    verifyRole("SA", "TA"),
    async (req: Request, _: Response, next: NextFunction) => {
        const { roles, tenant } = req.payload as Payload;
        const channelId = req.params.channelId as string;
        const result = await getChannelById({
            channelId,
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
        const result = await createChannel({
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
        const body: UpdateActivationReqBody = matchedBody(req);
        const result = await activationChannel({
            ...body,
            userRoles: roles,
            userTenant: tenant,
        });
        next(result);
    }
);

router.put(
    "/:channelId",
    verifyRole("SA", "TA"),
    updateValidator(),
    async (req: Request, _: Response, next: NextFunction) => {
        const body: UpdateReqBody = matchedBody(req);
        const channelId = req.params.channelId as string;
        const { id, roles } = req.payload as Payload;
        const result = await updateChannel({
            ...body,
            channelId,
            userRoles: roles,
            userId: id,
        });
        next(result);
    }
);

router.delete(
    "/:channelId",
    verifyRole("SA", "TA"),
    async (req: Request, _: Response, next: NextFunction) => {
        const { roles, tenant } = req.payload as Payload;
        const { channelId } = req.params;
        const result = await deleteChannel({
            channelId,
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
        const result = await deleteManyChannel({
            ids,
            userRoles: roles,
            userTenant: tenant,
        });
        next(result);
    }
);
