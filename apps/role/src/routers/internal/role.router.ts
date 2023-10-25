import express, { NextFunction, Request, Response } from "express";
import {
    findRoleByIds,
    findRoleType,
    findRolesHaveApprovalPermission,
    getRoleNotCustomer,
} from "../../controllers";

export const router = express.Router();

router.get(
    "/role-by-ids",
    async (req: Request, _: Response, next: NextFunction) => {
        const roleIds = req.query.roleIds as string[];
        const tenant = req.query.tenant as string;
        const result = await findRoleByIds({
            roleIds,
            userTenant: tenant,
        });
        next(result);
    }
);

router.get(
    "/role-type",
    async (req: Request, _: Response, next: NextFunction) => {
        const roleIds = req.query.roleIds as string[];
        const tenant = req.query.tenant as string;
        const result = await findRoleType({
            roleIds,
            userTenant: tenant,
        });
        next(result);
    }
);

router.get(
    "/role-not-customer",
    async (req: Request, _: Response, next: NextFunction) => {
        const tenant = req.query.tenant as string;
        const result = await getRoleNotCustomer({
            userTenant: tenant as string,
        });
        next(result);
    }
);
router.get(
    "/role-approval-permission",
    async (req: Request, _: Response, next: NextFunction) => {
        const tenant = req.query.tenant as string;
        const result = await findRolesHaveApprovalPermission({
            userTenant: tenant as string,
        });
        next(result);
    }
);
