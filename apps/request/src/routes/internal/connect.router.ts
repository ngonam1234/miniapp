import express, { NextFunction, Request, Response } from "express";
import {
    buildConnectTicket,
    deleteConnectsIncident,
    getConnectsIncident,
    updateConnectIncident,
} from "../../controllers/ticket.controller/connect.ticket";
import { CreateConnect } from "../../interfaces/request/connect.body";
import { FindReqQuery } from "../../interfaces/request/connect.query";

export const router = express.Router();

router.post("/", async (req: Request, _: Response, next: NextFunction) => {
    const { requests, incidents, userId } =
        req.body as unknown as CreateConnect;
    const result = await buildConnectTicket({
        type: "in",
        requests: requests,
        incidents: incidents,
        userId: userId,
    });
    next(result);
});

router.delete("/:id", async (req: Request, _: Response, next: NextFunction) => {
    const id = req.params.id;
    const result = await deleteConnectsIncident({
        id: id,
    });
    next(result);
});

router.post(
    "/connect-incident",
    async (req: Request, _: Response, next: NextFunction) => {
        const ids = req.body.ids as string[];
        console.log("🚀 ~ file: connect.router.ts:37 ~ ids:", ids);
        const query = req.query as unknown as FindReqQuery;
        const result = await getConnectsIncident({
            ids: ids,
            ...query,
        });
        next(result);
    }
);
router.put("/", async (req: Request, _: Response, next: NextFunction) => {
    const body = req.body as {
        ticketId: string;
        tenantTicket: string;
        requests: string[];
        userId: string;
    };
    const result = await updateConnectIncident(body);
    next(result);
});
