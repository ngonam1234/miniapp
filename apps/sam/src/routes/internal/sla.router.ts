import { validate } from "app";
import express, { NextFunction, Request, Response } from "express";
import {
    calculateSlaForTicket,
    checkSlaForTicket,
    findMatchingSlaForTicket,
} from "../../controllers";
import { ISla } from "../../interfaces/model";
import { slaQuerySchema } from "../../validator";

export const router = express.Router();

router.post(
    "/match",
    validate.query(slaQuerySchema),
    async (req: Request, _: Response, next: NextFunction) => {
        const module = String(req.query.module);
        const ticket = req.body as {
            id: string;
            tenant: string;
            created_time: string;
        };
        const result = await findMatchingSlaForTicket(ticket, module);
        next(result);
    }
);

router.post(
    "/calculate",
    async (req: Request, _: Response, next: NextFunction) => {
        const ticket = req.body as {
            id: string;
            created_time: string;
            sla: ISla;
        };
        const result = await calculateSlaForTicket(ticket);
        next(result);
    }
);

router.post(
    "/check",
    validate.query(slaQuerySchema),
    async (req: Request, _: Response, next: NextFunction) => {
        const body = req.body as { ticket_id: string; where: string };
        const module = String(req.query.module);
        const result = await checkSlaForTicket({
            ticketId: body.ticket_id,
            where: body.where,
            module,
        });
        next(result);
    }
);
