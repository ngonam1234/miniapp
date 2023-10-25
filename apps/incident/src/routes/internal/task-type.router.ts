import express, { NextFunction, Request, Response } from "express";
import { deleteManyTaskTypes } from "../../controllers/task-type.controller";

export const router = express.Router();

router.post(
    "/delete-many",
    async (req: Request, _: Response, next: NextFunction) => {
        const body = req.body;
        const result = await deleteManyTaskTypes({
            ...body,
        });
        next(result);
    }
);
