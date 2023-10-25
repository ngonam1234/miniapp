import { Payload, matchedQuery } from "app";
import express, { NextFunction, Request, Response } from "express";
import { getTemplateFieldData, findTemplateField } from "../../controllers";
import { FindReqQuery } from "../../interfaces/request/find.query";
import { verifyRole } from "../../middlewares";
import { findValidator } from "../../validator";

export const router = express.Router();

router.get(
    "/",
    verifyRole("SA", "TA"),
    findValidator(),
    async (req: Request, _: Response, next: NextFunction) => {
        const { tenant } = req.payload as Payload;
        const query: FindReqQuery = matchedQuery(req);
        const result = await findTemplateField({
            userTenant: tenant,
            ...query,
        });
        next(result);
    }
);

router.get(
    "/:fieldId/data",
    verifyRole("SA", "TA"),
    async (req: Request, _: Response, next: NextFunction) => {
        const { tenant } = req.payload as Payload;
        const query = req.query as unknown as { [key: string]: string };
        const fieldId = req.params.fieldId as string;
        const result = await getTemplateFieldData({
            userTenant: tenant,
            fieldId: fieldId,
            dependencies: query,
        });
        next(result);
    }
);
