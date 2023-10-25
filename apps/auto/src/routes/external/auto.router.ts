import { NextFunction, Request, Response, Router } from "express";
import {
    createAuto,
    deleteAuto,
    findAuto,
    getAutoById,
    getFieldData,
    updateAuto,
    updateAutoPriority,
} from "../../controllers";
import {
    CreateAutoReqBody,
    FindReqQuery,
    GetFieldDataReqQuery,
    UpdateAutoPriorityReqBody,
    UpdateAutoReqBody,
} from "../../interfaces/request";
import { Payload, matchedBody, matchedQuery } from "app";
import { verifyRole } from "../../middlewares";
import {
    createAutoValidator,
    findValidator,
    getFieldDataValidator,
    updateAutoPriorityValidator,
    updateAutoValidator,
} from "../../validator";

export const router: Router = Router();

router.post(
    "/",
    createAutoValidator(),
    verifyRole("SA", "TA"),
    async (req: Request, _: Response, next: NextFunction) => {
        const { id } = req.payload as Payload;
        const tenant = req.body.tenant as string;
        const type = String(req.query.type);
        const body: CreateAutoReqBody = matchedBody(req);
        const result = await createAuto({
            ...body,
            tenant,
            userId: id,
            type,
        });
        next(result);
    }
);

router.get(
    "/field-data",
    verifyRole("SA", "TA"),
    getFieldDataValidator(),
    async (req: Request, _: Response, next: NextFunction) => {
        const query: GetFieldDataReqQuery = matchedQuery(req);
        const result = await getFieldData(query);
        next(result);
    }
);

router.get(
    "/",
    verifyRole("SA", "TA"),
    findValidator(),
    async (req: Request, _: Response, next: NextFunction) => {
        const query: FindReqQuery = matchedQuery(req);
        const result = await findAuto({ ...query });
        next(result);
    }
);

router.get(
    "/:autoId",
    verifyRole("SA", "TA"),
    async (req: Request, _: Response, next: NextFunction) => {
        const { tenant: userTenant } = req.payload as Payload;
        const autoId = req.params.autoId as string;
        const result = await getAutoById({ autoId, userTenant });
        next(result);
    }
);

router.put(
    "/priority",
    updateAutoPriorityValidator(),
    verifyRole("SA", "TA"),
    async (req: Request, _: Response, next: NextFunction) => {
        const tenant = req.query.tenant as string;
        const body: UpdateAutoPriorityReqBody = req.body;
        const type = String(req.query.type);
        const result = await updateAutoPriority({
            tenant: tenant,
            priority: body,
            type,
        });
        next(result);
    }
);

router.put(
    "/:autoId",
    updateAutoValidator(),
    verifyRole("SA", "TA"),
    async (req: Request, _: Response, next: NextFunction) => {
        const body: UpdateAutoReqBody = matchedBody(req);
        const payload = req.payload as Payload;
        const autoId = req.params.autoId as string;
        const type = req.query.type as string;
        const tenant = req.body.tenant as string;
        const result = await updateAuto({
            ...body,
            autoId: autoId,
            tenant: tenant,
            userId: payload.id,
            type: type
        });
        next(result);
    }
);

router.post(
    "/delete",
    verifyRole("SA", "TA"),
    async (req: Request, _: Response, next: NextFunction) => {
        const autoId = req.body.ids as string[];
        const result = await deleteAuto({
            autoId: autoId,
        });
        next(result);
    }
);
