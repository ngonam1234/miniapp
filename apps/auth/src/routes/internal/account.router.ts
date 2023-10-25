import { NextFunction, Request, Response, Router } from "express";
import {
    getIdByEmail,
    getRoleById,
    updateTenantActivation,
} from "../../controllers";
import { UpdateTenantActivationReqBody } from "../../interfaces/request";
import { updateTenantActivationValidator } from "../../validator";

export const router: Router = Router();

router.post(
    "/update-tenant-activation",
    updateTenantActivationValidator(),
    async (req: Request, _: Response, next: NextFunction) => {
        const body = req.body as UpdateTenantActivationReqBody;
        const result = await updateTenantActivation(body);
        next(result);
    }
);

router.get(
    "/get-roles-by-id/:id",
    async (req: Request, _: Response, next: NextFunction) => {
        const id = req.params.id;
        const result = await getRoleById(id);
        next(result);
    }
);

router.get(
    "/get-id-by-email/:email",
    async (req: Request, _: Response, next: NextFunction) => {
        const email = req.params.email;
        const result = await getIdByEmail(email);
        next(result);
    }
);
