import { Payload } from "app";
import express, { NextFunction, Request, Response } from "express";
import {
    dashboardData,
    getTotalTicketsByStatus,
    getTotalTicketsByDate,
    searchByTypeAndName,
    getTicketCountByDepartment,
    getTicketCountByTechnician,
    getMyTickets,
} from "../../controllers";
import { verifyRole } from "../../middlewares";
import {
    SearchDashboardReqQuery,
    TicketReqQuery,
} from "../../interfaces/request";

export const router = express.Router();

router.get(
    "/",
    verifyRole("EU"),
    async (req: Request, _: Response, next: NextFunction) => {
        const { tenant, roles, id } = req.payload as Payload;
        const result = await dashboardData({
            userTenant: tenant,
            userRoles: roles,
            userId: id,
        });
        next(result);
    }
);

router.get(
    "/search",
    verifyRole("EU"),
    async (req: Request, _: Response, next: NextFunction) => {
        const { tenant, roles } = req.payload as Payload;
        const { name, type } = req.query as unknown as SearchDashboardReqQuery;
        const result = await searchByTypeAndName({
            userTenant: tenant,
            userRoles: roles,
            type,
            name,
        });
        next(result);
    }
);

router.get(
    "/my-tickets",
    verifyRole("TA", "L*"),
    async (req: Request, _: Response, next: NextFunction) => {
        const { tenant, roles, id } = req.payload as Payload;
        const result = await getMyTickets({
            userTenant: tenant,
            userRoles: roles,
            userId: id,
        });
        next(result);
    }
);

router.get(
    "/status",
    verifyRole("TA", "L*"),
    async (req: Request, _: Response, next: NextFunction) => {
        const { tenant, roles, id } = req.payload as Payload;
        const { startDate, endDate } = req.query as unknown as TicketReqQuery;
        const result = await getTotalTicketsByStatus({
            userTenant: tenant,
            userRoles: roles,
            userId: id,
            startDate,
            endDate,
        });
        next(result);
    }
);

router.get(
    "/date",
    verifyRole("TA", "L*"),
    async (req: Request, _: Response, next: NextFunction) => {
        const { tenant, roles, id } = req.payload as Payload;
        const { startDate, endDate } = req.query as unknown as TicketReqQuery;
        const result = await getTotalTicketsByDate({
            userTenant: tenant,
            userRoles: roles,
            userId: id,
            startDate,
            endDate,
        });
        next(result);
    }
);

router.get(
    "/department",
    verifyRole("TA", "L*"),
    async (req: Request, _: Response, next: NextFunction) => {
        const { tenant, roles, id } = req.payload as Payload;
        const { startDate, endDate, startDatePrew, endDatePrew } =
            req.query as unknown as TicketReqQuery;
        const result = await getTicketCountByDepartment({
            userTenant: tenant,
            userRoles: roles,
            userId: id,
            startDate,
            endDate,
            startDatePrew,
            endDatePrew,
        });
        next(result);
    }
);

router.get(
    "/technician",
    verifyRole("TA", "L*"),
    async (req: Request, _: Response, next: NextFunction) => {
        const { tenant, roles, id } = req.payload as Payload;
        const { startDate, endDate, startDatePrew, endDatePrew } =
            req.query as unknown as TicketReqQuery;
        const result = await getTicketCountByTechnician({
            userTenant: tenant,
            userRoles: roles,
            userId: id,
            startDate,
            endDate,
            startDatePrew,
            endDatePrew,
        });
        next(result);
    }
);
