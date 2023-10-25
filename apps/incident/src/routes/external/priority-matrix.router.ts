import { Payload, matchedBody, matchedQuery } from "app";
import express, { NextFunction, Request, Response } from "express";
import {
    CreatePriorityMatrixReqBody,
    DeletePriorityMatrixReqBody,
    FindPriorityMatrixReqQuery,
} from "../../interfaces/request/priority-matrix.body";
import {
    createPriorityMatrix,
    deletePriorityMatrix,
    getPriorityMatrix,
} from "../../controllers/priority-matrix.controller";
import {
    createPriorityMatrixValidator,
    deletePriorityMatrixValidator,
    getPriorityMatrixValidator,
} from "../../validator/priority-matrix.validator";
import { verifyRole } from "../../middlewares";
export const router = express.Router();

router.get(
    "/",
    verifyRole("SA", "TA"),
    getPriorityMatrixValidator(),
    async (req: Request, _: Response, next: NextFunction) => {
        const query: FindPriorityMatrixReqQuery = matchedQuery(req);
        const { roles } = req.payload as Payload;
        const result = await getPriorityMatrix({
            ...query,
            userRoles: roles,
        });
        next(result);
    }
);

router.post(
    "/",
    verifyRole("SA", "TA"),
    createPriorityMatrixValidator(),
    async (req: Request, _: Response, next: NextFunction) => {
        const { id } = req.payload as Payload;
        const tenant = req.query.tenant as string;
        const body: CreatePriorityMatrixReqBody = matchedBody(req);
        const result = await createPriorityMatrix({
            ...body,
            userId: id,
            tenant: tenant,
        });
        next(result);
    }
);

router.delete(
    "/",
    verifyRole("SA", "TA"),
    deletePriorityMatrixValidator(),
    async (req: Request, _: Response, next: NextFunction) => {
        const body: DeletePriorityMatrixReqBody = matchedBody(req);
        const tenant = req.query.tenant;
        console.log(
            "🚀 ~ file: priority-matrix.router.ts:60 ~ tenant:",
            tenant
        );
        const result = await deletePriorityMatrix({
            ...body,
            tenant: tenant as string,
        });
        next(result);
    }
);
