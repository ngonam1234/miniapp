import { matchedQuery } from "app";
import express, { NextFunction, Request, Response } from "express";
import { findWorkflow, getWorkflowById } from "../../controllers";
import { FindReqQuery } from "../../interfaces/request";
import { verifyRole } from "../../middlewares";
import { findValidator } from "../../validator";

export const router = express.Router();

router.get(
    "/",
    verifyRole("SA", "TA"),
    findValidator(),
    async (req: Request, _: Response, next: NextFunction) => {
        const query: FindReqQuery = matchedQuery(req);
        const result = await findWorkflow(query);
        next(result);
    }
);

router.get(
    "/:workflowId",
    verifyRole("TA", "SA"),
    async (req: Request, _: Response, next: NextFunction) => {
        const tenant = req.payload?.tenant;
        const workflowId = req.params.workflowId;
        const result = await getWorkflowById({
            workflowId,
            tenant,
        });
        next(result);
    }
);
