import express, { NextFunction, Request, Response, Router } from "express";
import {
    findTenantByEmail,
    findTenant_,
    getTenantBy,
    getTenantByCodes,
    increaseUser,
} from "../../controllers";
import {
    FindTenantReqQuery,
    IncreaseUserReqBody,
} from "../../interfaces/request";
import {
    getTenantByCodesValidator,
    increaseUserValidator,
} from "../../validator";
export const router: Router = express.Router();

router.get("/", async (req: Request, _: Response, next: NextFunction) => {
    const query = req.query as unknown as FindTenantReqQuery;
    const result = await findTenant_(query);
    next(result);
});
router.get(
    "/:tenantCode",
    async (req: Request, _: Response, next: NextFunction) => {
        const tenantCode = req.params.tenantCode as string;
        const result = await getTenantBy({ type: "code", key: tenantCode });
        next(result);
    }
);

router.put(
    "/increase-user",
    increaseUserValidator(),
    async (req: Request, _: Response, next: NextFunction) => {
        const body = req.body as IncreaseUserReqBody;
        const result = await increaseUser(body.data);
        next(result);
    }
);

router.post(
    "/get-by-codes",
    getTenantByCodesValidator(),
    async (req: Request, _: Response, next: NextFunction) => {
        const { codes } = req.body;
        const result = await getTenantByCodes({ codes });
        next(result);
    }
);

router.post(
    "/get-by-email",
    async (req: Request, _: Response, next: NextFunction) => {
        const email = req.body.email;
        const result = await findTenantByEmail({ email });
        next(result);
    }
);
