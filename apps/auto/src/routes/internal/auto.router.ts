import express, { NextFunction, Request, Response } from "express";
import { findAutoMatchesTicketValidator } from "../../validator";
import { deleteDepartment, findMatchingAutoForTicket } from "../../controllers";

export const router = express.Router();
router.post(
    "/match",
    findAutoMatchesTicketValidator(),
    async (req: Request, _: Response, next: NextFunction) => {
        const ticket = req.body;
        const apply_request = req.query.apply_request as string;
        const type = String(req.query.type);
        const result = await findMatchingAutoForTicket(
            ticket,
            apply_request,
            type
        );
        next(result);
    }
);

router.put(
    "/delete",
    // findAutoMatchesTicketValidator(),
    async (req: Request, _: Response, next: NextFunction) => {
        const body = req.body as {
            tenant: string,
            ids: string[]
        };
        const result = await deleteDepartment({ ...body });
        next(result);
    }
);
