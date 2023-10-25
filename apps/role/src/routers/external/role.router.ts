import { Payload, matchedBody, matchedQuery } from "app";
import express, { NextFunction, Request, Response } from "express";
import {
    createRoleCustomer,
    createRoleEmployee,
    deleteManyRoles,
    deleteRole,
    findRole,
    getRoleById,
    getRoleForUser,
    updateRoleCustomer,
    updateRoleEmployee,
} from "../../controllers";
import {
    CreateRoleCustomerReqBody,
    CreateRoleEmployeeReqBody,
    FindReqQuery,
    UpdateRoleCustomerReqBody,
    UpdateRoleEmployeeReqBody,
} from "../../interfaces/request";
import { verifyRole } from "../../middlewares";
import {
    createCustomerValidator,
    createEmployeeValidator,
    deleteManyValidator,
    findValidator,
    updateCustomerValidator,
    updateEmployeeValidator,
} from "../../validator";

export const router = express.Router();

router.get(
    "/",
    verifyRole("SA", "TA"),
    findValidator(),
    async (req: Request, _: Response, next: NextFunction) => {
        const query: FindReqQuery = matchedQuery(req);
        const result = await findRole(query);
        next(result);
    }
);

router.get(
    "/role-user",
    async (req: Request, _: Response, next: NextFunction) => {
        const { tenant } = req.payload as Payload;
        const result = await getRoleForUser({ tenant });
        next(result);
    }
);

router.get(
    "/:roleId",
    verifyRole("*"),
    async (req: Request, _: Response, next: NextFunction) => {
        const { roles, tenant } = req.payload as Payload;
        const roleId = req.params.roleId as string;
        const result = await getRoleById({
            roleId,
            userRoles: roles,
            userTenant: tenant,
        });
        next(result);
    }
);

router.post(
    "/employee",
    verifyRole("SA", "TA"),
    createEmployeeValidator(),
    async (req: Request, _: Response, next: NextFunction) => {
        const { roles, id } = req.payload as Payload;
        const body: CreateRoleEmployeeReqBody = matchedBody(req);
        const tenant = req.query.tenant as string;
        const result = await createRoleEmployee({
            ...body,
            userRoles: roles,
            userId: id,
            userTenant: tenant,
        });
        next(result);
    }
);

router.post(
    "/customer",
    verifyRole("SA", "TA"),
    createCustomerValidator(),
    async (req: Request, _: Response, next: NextFunction) => {
        const { roles, id } = req.payload as Payload;
        const body: CreateRoleCustomerReqBody = matchedBody(req);
        const tenant = req.query.tenant as string;
        const result = await createRoleCustomer({
            ...body,
            userRoles: roles,
            userId: id,
            userTenant: tenant,
        });
        next(result);
    }
);

router.put(
    "/employee/:roleId",
    verifyRole("SA", "TA"),
    updateEmployeeValidator(),
    async (req: Request, _: Response, next: NextFunction) => {
        const { roles, tenant, id } = req.payload as Payload;
        const roleId = req.params.roleId as string;
        const body: UpdateRoleEmployeeReqBody = matchedBody(req);
        const result = await updateRoleEmployee({
            roleId,
            ...body,
            userRoles: roles,
            userId: id,
            userTenant: tenant,
        });
        next(result);
    }
);

router.put(
    "/customer/:roleId",
    verifyRole("SA", "TA"),
    updateCustomerValidator(),
    async (req: Request, _: Response, next: NextFunction) => {
        const { roles, tenant, id } = req.payload as Payload;
        const roleId = req.params.roleId as string;
        const body: UpdateRoleCustomerReqBody = matchedBody(req);
        const result = await updateRoleCustomer({
            roleId,
            ...body,
            userRoles: roles,
            userId: id,
            userTenant: tenant,
        });
        next(result);
    }
);

router.delete(
    "/:roleId",
    verifyRole("SA", "TA"),
    async (req: Request, _: Response, next: NextFunction) => {
        const { roles, tenant, id } = req.payload as Payload;
        const roleId = req.params.roleId as string;
        const result = await deleteRole({
            roleId,
            userRoles: roles,
            userId: id,
            userTenant: tenant,
        });
        next(result);
    }
);

router.post(
    "/delete-many",
    verifyRole("SA", "TA"),
    deleteManyValidator(),
    async (req: Request, _: Response, next: NextFunction) => {
        const { roles, tenant, id } = req.payload as Payload;
        const { roleIds } = req.body as { roleIds: string[] };
        const result = await deleteManyRoles({
            roleIds,
            userRoles: roles,
            userId: id,
            userTenant: tenant,
        });
        next(result);
    }
);
