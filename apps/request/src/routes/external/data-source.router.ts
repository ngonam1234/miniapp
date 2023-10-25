import express, { NextFunction, Request, Response } from "express";
import { verifyTenantUser } from "../../middlewares";
import { getAllPriority, getAllType, getDepartments } from "../../controllers";
import { Payload, ResultSuccess, success } from "app";
import {
    getAllGroup,
    getAllNotRoleEU,
    getRequesters,
    getServeices,
} from "../../service";
import { UserResBody } from "../../interfaces/response";
export const router = express.Router();
router.get(
    "/departments",
    verifyTenantUser,
    async (req: Request, _: Response, next: NextFunction) => {
        const { tenant } = req.payload as Payload;
        const result = await getDepartments({
            tenant: tenant as string,
        });
        next(result);
    }
);

router.get(
    "/services",
    verifyTenantUser,
    async (req: Request, _: Response, next: NextFunction) => {
        const { tenant } = req.payload as Payload;
        const result = await getServeices(tenant, true);

        next(success.ok(result.body));
    }
);

router.get(
    "/requesters",
    verifyTenantUser,
    async (req: Request, _: Response, next: NextFunction) => {
        const { tenant } = req.payload as Payload;
        const is_active = true;
        const result = await getRequesters(tenant, is_active);
        next(success.ok(result.body));
    }
);

router.get(
    "/types",
    verifyTenantUser,
    async (req: Request, _: Response, next: NextFunction) => {
        const { tenant } = req.payload as Payload;
        const is_active = true;
        const res = (await getAllType({ tenant, is_active })) as ResultSuccess;
        next(
            success.ok(
                res.data.map((b: { id: string; name: string }) => ({
                    id: b.id,
                    name: b.name,
                }))
            )
        );
    }
);

router.get(
    "/priorities",
    verifyTenantUser,
    async (req: Request, _: Response, next: NextFunction) => {
        const { tenant } = req.payload as Payload;
        const is_active = true;
        const res = (await getAllPriority({
            tenant,
            is_active,
        })) as ResultSuccess;
        next(
            success.ok(
                res.data.map((b: { id: string; name: string }) => ({
                    id: b.id,
                    name: b.name,
                }))
            )
        );
    }
);

router.get(
    "/groups",
    verifyTenantUser,
    async (req: Request, _: Response, next: NextFunction) => {
        const { tenant } = req.payload as Payload;
        if (tenant) {
            const result = await getAllGroup({ tenant });
            next(
                success.ok(
                    result.body?.map((b: { id: string; name: string }) => ({
                        id: b.id,
                        name: b.name,
                    }))
                )
            );
        }
    }
);

router.get(
    "/technicians",
    verifyTenantUser,
    async (req: Request, _: Response, next: NextFunction) => {
        const { roles, id, tenant } = req.payload as Payload;
        const res = await getAllNotRoleEU({
            userRoles: roles,
            userTenant: tenant,
            userId: id,
        });
        next(
            success.ok(
                res.body?.map((b: UserResBody) => ({
                    id: b.id,
                    name: b.fullname,
                }))
            )
        );
    }
);
