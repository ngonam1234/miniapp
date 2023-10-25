import express, { NextFunction, Request, Response } from "express";
import {
    getTicketStatisticByStatus as countTicketByStatus,
    createTicketIn,
    createTicketInEU,
    findTicketNotConnect,
    getMyTickets,
    getRawTicketById,
    getTicketStatisticByDate,
    getTicketStatisticByDepartment,
    getTicketStatisticByTechnician,
} from "../../controllers";
import { updateTicketIn } from "../../controllers/ticket.controller";
import {
    CountTicketByStatusReqQuery,
    CreateTicketReqBodyIn,
    UpdateTicketInReqBody,
} from "../../interfaces/request";

export const router = express.Router();

router.get(
    "/my-tickets",
    async (req: Request, _: Response, next: NextFunction) => {
        const { tenant, roles, userId, startDate, endDate } =
            req.query as unknown as CountTicketByStatusReqQuery;
        const result = await getMyTickets({
            userTenant: tenant,
            userRoles: roles,
            userId,
        });
        next(result);
    }
);

router.get(
    "/count-by-status",
    async (req: Request, _: Response, next: NextFunction) => {
        const { tenant, roles, userId, startDate, endDate } =
            req.query as unknown as CountTicketByStatusReqQuery;
        const result = await countTicketByStatus({
            userTenant: tenant,
            userRoles: roles,
            userId,
            start: startDate,
            end: endDate,
        });
        next(result);
    }
);

router.get(
    "/count-by-date",
    async (req: Request, _: Response, next: NextFunction) => {
        const { tenant, roles, userId, startDate, endDate } =
            req.query as unknown as CountTicketByStatusReqQuery;
        const result = await getTicketStatisticByDate({
            userRoles: roles,
            userTenant: tenant,
            userId,
            start: startDate,
            end: endDate,
        });
        next(result);
    }
);

router.get(
    "/count-by-department",
    async (req: Request, _: Response, next: NextFunction) => {
        const {
            tenant,
            roles,
            userId,
            startDate,
            endDate,
            startDatePrew,
            endDatePrew,
        } = req.query as unknown as CountTicketByStatusReqQuery;
        const result = await getTicketStatisticByDepartment({
            userRoles: roles,
            userTenant: tenant,
            userId,
            start: startDate,
            end: endDate,
            startPrew: startDatePrew,
            endPrew: endDatePrew,
        });
        next(result);
    }
);

router.get(
    "/count-by-technician",
    async (req: Request, _: Response, next: NextFunction) => {
        const {
            tenant,
            roles,
            userId,
            startDate,
            endDate,
            startDatePrew,
            endDatePrew,
        } = req.query as unknown as CountTicketByStatusReqQuery;
        const result = await getTicketStatisticByTechnician({
            userRoles: roles,
            userTenant: tenant,
            userId,
            start: startDate,
            end: endDate,
            startPrew: startDatePrew,
            endPrew: endDatePrew,
        });
        next(result);
    }
);

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
            type: "incident",
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
