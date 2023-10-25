import express, { NextFunction, Request, Response } from "express";
import { createActiveTemplateIn } from "../../controllers";

export const router = express.Router();

router.post("/", async (req: Request, _: Response, next: NextFunction) => {
    const { template, code, is_active } = req.body;
    const result = await createActiveTemplateIn({
        code: code,
        template: template,
        is_active: is_active,
    });
    next(result);
});
