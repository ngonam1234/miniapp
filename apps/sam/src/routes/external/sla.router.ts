import { HttpError, Payload, error, validate } from "app";
import express, { NextFunction, Request, Response } from "express";
import Joi from "joi";
import {
    createSla,
    deleteSla,
    findSla,
    getFieldData,
    getSlaById,
    updateSla,
    updateSlaOrder,
} from "../../controllers";
import {
    CreateSlaReqBody,
    FindSlaReqQuery,
    GetFieldDataReqQuery,
    UpdateSlaOrderReqBody,
    UpdateSlaReqBody,
} from "../../interfaces/request";
import { verifyRole } from "../../middlewares";
import {
    createSlaShema,
    findSlaSchema,
    getFieldDataSchema,
    slaQuerySchema,
    updateSlaOrderSchema,
    updateSlaSchema,
} from "../../validator";

export const router = express.Router();

router.get(
    "/field-data",
    verifyRole("SA", "TA"),
    validate.query(getFieldDataSchema),
    async (req: Request, _: Response, next: NextFunction) => {
        const query = req.query as unknown as GetFieldDataReqQuery;
        let tenant = req.payload?.tenant;
        if (req.payload?.roles.includes("SA")) {
            tenant = req.query.tenant as typeof tenant;
        }
        tenant = String(validateTenant(tenant));
        const result = await getFieldData({ ...query, tenant });
        next(result);
    }
);

router.get(
    "/",
    verifyRole("SA", "TA"),
    validate.query(findSlaSchema),
    async (req: Request, _: Response, next: NextFunction) => {
        let tenant = req.payload?.tenant;
        if (req.payload?.roles.includes("SA")) {
            tenant = req.query.tenant as typeof tenant;
        }
        tenant = validateTenant(tenant, false);
        const query = req.query as unknown as FindSlaReqQuery;
        const result = await findSla({ ...query, tenant });
        next(result);
    }
);

router.post(
    "/",
    verifyRole("SA", "TA"),
    validate.query(slaQuerySchema),
    validate.body(createSlaShema),
    async (req: Request, _: Response, next: NextFunction) => {
        const { id: userId } = req.payload as Payload;
        let tenant = req.payload?.tenant;
        if (req.payload?.roles.includes("SA")) {
            tenant = req.query.tenant as typeof tenant;
        }
        const module = String(req.query.module);
        tenant = String(validateTenant(tenant));
        const body: CreateSlaReqBody = req.body;
        const params = { ...body, tenant, userId, module };
        const result = await createSla(params);
        next(result);
    }
);

router.get(
    "/:slaId",
    verifyRole("SA", "TA"),
    async (req: Request, _: Response, next: NextFunction) => {
        let tenant = req.payload?.tenant;
        if (req.payload?.roles.includes("SA")) {
            tenant = req.query.tenant as typeof tenant;
        }
        tenant = validateTenant(tenant, false);
        const slaId = String(req.params.slaId);
        const result = await getSlaById({ slaId, tenant });
        next(result);
    }
);

router.put(
    "/order",
    verifyRole("SA", "TA"),
    validate.query(slaQuerySchema),
    validate.body(updateSlaOrderSchema),
    async (req: Request, _: Response, next: NextFunction) => {
        const order: UpdateSlaOrderReqBody = req.body;
        let tenant = req.payload?.tenant;
        if (req.payload?.roles.includes("SA")) {
            tenant = req.query.tenant as typeof tenant;
        }
        tenant = String(validateTenant(tenant));
        const module = String(req.query.module);
        const result = await updateSlaOrder({ module, tenant, order });
        next(result);
    }
);

router.put(
    "/:slaId",
    verifyRole("SA", "TA"),
    validate.body(updateSlaSchema),
    async (req: Request, _: Response, next: NextFunction) => {
        const body: UpdateSlaReqBody = req.body;
        let tenant = req.payload?.tenant;
        if (req.payload?.roles.includes("SA")) {
            tenant = req.query.tenant as typeof tenant;
        }
        const { id: userId } = req.payload as Payload;
        tenant = validateTenant(tenant, false);
        const slaId = String(req.params.slaId);
        const result = await updateSla({ ...body, tenant, slaId, userId });
        next(result);
    }
);

router.put(
    "/:slaId",
    verifyRole("SA", "TA"),
    validate.body(updateSlaSchema),
    async (req: Request, _: Response, next: NextFunction) => {
        const { id: userId } = req.payload as Payload;
        const slaId = req.params.slaId as string;
        let tenant = req.payload?.tenant;
        if (req.payload?.roles.includes("SA")) {
            tenant = req.query.tenant as typeof tenant;
        }
        tenant = validateTenant(tenant);
        const body: UpdateSlaReqBody = req.body;
        const result = await updateSla({ ...body, userId, tenant, slaId });
        next(result);
    }
);

router.delete(
    "/:slaId",
    verifyRole("SA", "TA"),
    async (req: Request, _: Response, next: NextFunction) => {
        const { id: userId } = req.payload as Payload;
        let tenant = req.payload?.tenant;
        if (req.payload?.roles.includes("SA")) {
            tenant = req.query.tenant as typeof tenant;
        }
        tenant = validateTenant(tenant, false);
        const slaId = req.params.slaId as string;
        const result = await deleteSla({ userId, tenant, slaId });
        next(result);
    }
);

function validateTenant(
    tenant: unknown,
    required = true,
    location = "query"
): never | string | undefined {
    let rule = { tenant: Joi.string().required() };
    if (required === false) {
        rule = { tenant: Joi.string() };
    }

    const schema = Joi.object(rule);
    const result = schema.validate({ tenant });

    if (result.error) {
        let message = result.error.message;
        message = message.replace('"tenant"', "'tenant'");
        throw new HttpError(
            error.invalidData({
                location,
                param: "tenant",
                value: tenant,
                message,
            })
        );
    }
    return tenant as string | undefined;
}
