import express, { NextFunction, Request, Response } from "express";
import {
    getTicketStatisticByStatus as countTicketByStatus,
    createTicketIn,
    createTicketInEU,
    findTicketNotConnect,
    getRawTicketById,
    updateTicketIn,
} from "../../controllers";
import {
    CountTicketByStatusReqQuery,
    CreateTicketReqBodyIn,
    UpdateTicketInReqBody,
} from "../../interfaces/request";
export const router = express.Router();

router.get(
    "/count-by-status",
    async (req: Request, _: Response, next: NextFunction) => {
        const { tenant, roles, userId } =
            req.query as unknown as CountTicketByStatusReqQuery;
        const result = await countTicketByStatus({
            userTenant: tenant,
            userRoles: roles,
            userId: userId,
        });
        next(result);
    }
);

router.post("/", async (req: Request, _: Response, next: NextFunction) => {
    const body: CreateTicketReqBodyIn = req.body;
    const result = await createTicketIn({
        ...body,
    });
    next(result);
});

router.post("/eu", async (req: Request, _: Response, next: NextFunction) => {
    const body: CreateTicketReqBodyIn = req.body;
    const result = await createTicketInEU({
        ...body,
    });
    next(result);
});

router.get(
    "/not-connect",
    async (req: Request, _: Response, next: NextFunction) => {
        const {
            query,
            sort,
            size,
            page,
            ticketId,
            ticketTenant,
            userRoles,
            userTenant,
            userId,
        } = req.query as unknown as {
            query?: string;
            sort?: string;
            size: number;
            page: number;
            ticketId?: string;
            ticketTenant: string;
            userRoles: string[];
            userTenant?: string;
            userId: string;
            type: string;
        };
        const result = await findTicketNotConnect({
            query,
            sort,
            size,
            page,
            ticketId,
            ticketTenant,
            userRoles,
            userTenant,
            userId,
            type: "request",
        });
        next(result);
    }
);

router.put(
    "/:ticketId",
    async (req: Request, _: Response, next: NextFunction) => {
        const ticketId = String(req.params.ticketId);
        const result = await getRawTicketById(ticketId);
        next(result);
    }
);

router.put(
    "/:ticketId",
    async (req: Request, _: Response, next: NextFunction) => {
        const ticketId = String(req.params.ticketId);
        const body: UpdateTicketInReqBody = req.body;
        const result = await updateTicketIn({ ...body, ticketId });
        next(result);
    }
);
