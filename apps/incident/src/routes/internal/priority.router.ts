import express, { NextFunction, Request, Response } from "express";
import { getAllPriority } from "../../controllers";
import { getAllDataValidator } from "../../validator";

export const router = express.Router();

router.get(
    "/",
    getAllDataValidator(),
    async (req: Request, _: Response, next: NextFunction) => {
        const tenant = req.query.tenant as string | undefined;
        const is_active = req.query.is_active as undefined | boolean;
        const result = await getAllPriority({ tenant, is_active });
        next(result);
    }
);
