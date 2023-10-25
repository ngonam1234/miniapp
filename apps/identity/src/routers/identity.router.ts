import { NextFunction, Request, Response, Router } from "express";
import { getIdentity } from "../controllers";
import { getIdentityValidator } from "../validator";

export const router: Router = Router();

router.get(
    "/",
    getIdentityValidator(),
    async (req: Request, _: Response, next: NextFunction) => {
        const key = req.query.key as string;
        const result = await getIdentity(key);
        next(result);
    }
);
