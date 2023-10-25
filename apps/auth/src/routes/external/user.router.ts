import { matchedBody, matchedQuery, Payload } from "app";
import { NextFunction, Request, Response, Router } from "express";
import {
    createUser,
    findUser,
    getLeaderInGroupsOfUser,
    getTemplateUrl,
    getUserById,
    getUsersHaveApprovalPermission,
    getUsersNotCustomerPortal,
    importUser,
    updateUser,
    updateUserActivation
} from "../../controllers";
import {
    CreateUserReqBody,
    FindReqQuery,
    FindUsersNotCustomerPortal,
    ImportUserReqBody,
    UpdateUserActivationReqBody,
    UpdateUserReqBody
} from "../../interfaces/request";
import { verifyRole } from "../../middlewares";
import {
    createUserValidator,
    findUsersNotCustomerPortal,
    findUserValidator,
    importUserValidator,
    updateActivationValidator,
    updateUserValidator,
} from "../../validator";

export const router: Router = Router();

router.get(
    "/not-customer",
    verifyRole("SA", "TA"),
    findUsersNotCustomerPortal(),
    async (req: Request, _: Response, next: NextFunction) => {
        const query: FindUsersNotCustomerPortal = matchedQuery(req);
        const result = await getUsersNotCustomerPortal({
            ...query,
            userTenant: query.tenant,
        });
        next(result);
    }
);

router.get(
    "/import-template",
    verifyRole("SA", "TA"),
    async (_: Request, __: Response, next: NextFunction) => {
        const result = await getTemplateUrl();
        next(result);
    }
);

router.get(
    "/",
    verifyRole("SA", "TA"),
    findUserValidator(),
    async (req: Request, _: Response, next: NextFunction) => {
        const query: FindReqQuery = matchedQuery(req);
        const payload = req.payload as Payload;
        const result = await findUser({
            ...query,
            userRoles: payload.roles,
        });
        next(result);
    }
);

router.post(
    "/",
    verifyRole("SA", "TA"),
    createUserValidator(),
    async (req: Request, _: Response, next: NextFunction) => {
        const body: CreateUserReqBody = matchedBody(req);
        const tenant = req.query.tenant as string | undefined;
        const payload = req.payload as Payload;
        const result = await createUser({
            ...body,
            userId: payload.id,
            userRoles: payload.roles,
            tenant,
        });
        next(result);
    }
);

router.post(
    "/import",
    verifyRole("SA", "TA"),
    importUserValidator(),
    async (req: Request, _: Response, next: NextFunction) => {
        const body: ImportUserReqBody = req.body;
        const payload = req.payload as Payload;
        if (!payload.roles.includes("SA")) {
            body.forEach((u) => (u.tenant = payload.tenant));
        }

        const result = await importUser({
            importData: body,
            userId: payload.id,
            userRoles: payload.roles,
        });
        next(result);
    }
);

router.post(
    "/update-activation",
    verifyRole("SA", "TA"),
    updateActivationValidator(),
    async (req: Request, _: Response, next: NextFunction) => {
        const body: UpdateUserActivationReqBody = matchedBody(req);
        const payload = req.payload as Payload;
        const result = await updateUserActivation({
            ...body,
            userRoles: payload.roles,
            tenant: payload.tenant,
        });
        next(result);
    }
);

router.get(
    "/:id/get-user-task-permission",
    async (req: Request, _: Response, next: NextFunction) => {
        const userId = req.params.id as string;
        const tenant = req.payload?.tenant as string;
        const result = await getUsersHaveApprovalPermission(userId, tenant);
        next(result);
    }
);
router.get(
    "/:id/get-leader",
    async (req: Request, _: Response, next: NextFunction) => {
        const userId = req.params.id as string;
        const tenant = req.payload?.tenant as string;
        const result = await getLeaderInGroupsOfUser({
            userId: userId,
            tenant: tenant,
        });
        next(result);
    }
);

router.get(
    "/:userId",
    verifyRole("*"),
    async (req: Request, _: Response, next: NextFunction) => {
        const payload = req.payload as Payload;
        const { userId } = req.params;
        const result = await getUserById({
            id: userId,
            tenant: payload.tenant,
            userRoles: payload.roles,
            userId: payload.id,
        });
        next(result);
    }
);

router.put(
    "/:userId",
    verifyRole("SA", "TA"),
    updateUserValidator(),
    async (req: Request, _: Response, next: NextFunction) => {
        const body: UpdateUserReqBody = matchedBody(req);
        const payload = req.payload as Payload;
        const userId = req.params.userId as string;
        const result = await updateUser({
            ...body,
            id: userId,
            userId: payload.id,
            userRoles: payload.roles,
        });
        next(result);
    }
);
