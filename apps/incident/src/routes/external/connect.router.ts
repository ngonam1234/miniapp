import express, { NextFunction, Request, Response } from "express";
import { verifyRole } from "../../middlewares";
import {
    buildConnectTicket,
    deleteConnect,
    getConnectById,
    updateConnectTicketsById,
} from "../../controllers/ticket.controller/connect.ticket";
import { CreateConnect } from "../../interfaces/request/connect.body";
import {
    createConnectValidator,
    findConnectValidator,
} from "../../validator/connect.validator";
import { Payload, matchedQuery } from "app";
import { FindReqQuery } from "../../interfaces/request/connect.query";

export const router = express.Router();

router.post(
    "/",
    verifyRole("SA", "TA", "L1", "L2"),
    createConnectValidator(),
    async (req: Request, _: Response, next: NextFunction) => {
        const { id } = req.payload as Payload;
        const { requests, incidents }: CreateConnect = req.body;
        const result = await buildConnectTicket({
            type: "ex",
            requests: requests,
            incidents: incidents,
            userId: id,
        });
        next(result);
    }
);

router.put(
    "/delete/:id",
    verifyRole("SA", "TA", "L1", "L2"),
    async (req: Request, _: Response, next: NextFunction) => {
        const incident_id = req.params.id;
        const { requests, incidents } = req.body as {
            requests: string[];
            incidents: string[];
        };
        const { id, tenant, roles } = req.payload as Payload;
        const result = await deleteConnect({
            id: incident_id,
            requests: requests,
            incidents: incidents,
            userId: id,
            userTenant: tenant,
            userRoles: roles,
        });
        next(result);
    }
);

router.get(
    "/:id",
    findConnectValidator(),
    async (req: Request, _: Response, next: NextFunction) => {
        const id = req.params.id as string;
        const query: FindReqQuery = matchedQuery(req);
        const result = await getConnectById({ ...query, id: id });
        next(result);
    }
);

router.put(
    "/add-connect/:id",
    async (req: Request, _: Response, next: NextFunction) => {
        const ticketId = req.params.id as string;
        const { requests, incidents } = req.body as {
            requests: string[];
            incidents: string[];
        };
        const { id, tenant, roles } = req.payload as Payload;
        const result = await updateConnectTicketsById({
            ticketId: ticketId,
            incidents: incidents,
            requests: requests,
            userId: id,
            userTenant: tenant,
            userRoles: roles,
        });
        next(result);
    }
);
