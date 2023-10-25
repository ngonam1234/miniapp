import { NextFunction, Request, Response, Router } from "express";
import {
    getUserByIds,
    _getUserById,
    findUser,
    getUserByEmail,
    getUserByIdAndTenantCode,
    updateAssigneeTicket,
    deleteDepartmentOfUser,
    updateUser,
    getTotalUserHaveRole,
    __getUserById,
    findUserByRoleEU,
    getAllUsers,
    getAllNotRoleEU,
} from "../../controllers";
import {
    findUserByIdsValidator,
    findUserInternalValidator,
    findUserValidator,
} from "../../validator";
import {
    FindUserByEmailReqQuery,
    FindReqQuery,
    FindUserByIdAndTenantCodeReqQuery,
    DeleteDepartmentActivationReqBody,
    UpdateUserReqBody,
} from "../../interfaces/request";

export const router: Router = Router();
router.get(
    "/get-user-by-id-and-Tcode",
    async (req: Request, _: Response, next: NextFunction) => {
        const { userid, tenant } =
            req.query as unknown as FindUserByIdAndTenantCodeReqQuery;
        const result = await getUserByIdAndTenantCode({ userid, tenant });
        next(result);
    }
);
router.post(
    "/delete-department",
    async (req: Request, _: Response, next: NextFunction) => {
        const body = req.body as DeleteDepartmentActivationReqBody;
        const result = await deleteDepartmentOfUser(body);
        next(result);
    }
);
router.get(
    "/",
    findUserInternalValidator(),
    async (req: Request, _: Response, next: NextFunction) => {
        const query = req.query as unknown as FindReqQuery;
        const is_active = req.query.is_active as unknown as boolean;
        const result = await findUser({
            ...query,
            userRoles: [],
            is_active,
        });
        next(result);
    }
);
router.get("/all", async (req: Request, _: Response, next: NextFunction) => {
    const is_active = req.query.is_active as unknown as boolean;
    const tenant = req.query.tenant;
    const result = await getAllUsers({
        tenant: tenant as string,
        is_active,
    });
    next(result);
});
router.get(
    "/eu",
    findUserValidator(),
    async (req: Request, _: Response, next: NextFunction) => {
        const query = req.query as unknown as FindReqQuery;
        const result = await findUserByRoleEU({
            ...query,
            userTenant: query.tenant,
            userRoles: ["EU"],
        });
        next(result);
    }
);

router.post("/not-eu", async (req: Request, _: Response, next: NextFunction) => {
    const result = await getAllNotRoleEU({
        userTenant: req.body.userTenant,
        userRoles: req.body.userRoles,
        userId: req.body.userId,
    });
    next(result);
});

router.post(
    "/get-by-ids",
    findUserByIdsValidator(),
    async (req: Request, _: Response, next: NextFunction) => {
        const { ids } = req.body;
        const result = await getUserByIds(ids);
        next(result);
    }
);

router.get(
    "/get-by-email",
    async (req: Request, _: Response, next: NextFunction) => {
        const { email, tenant } =
            req.query as unknown as FindUserByEmailReqQuery;
        const result = await getUserByEmail({ email, tenant });
        next(result);
    }
);

router.get(
    "/total-user-have-role",
    async (req: Request, _: Response, next: NextFunction) => {
        const role = req.query.role as string;
        const tenant = req.query.tenant as string;
        const result = await getTotalUserHaveRole({
            role,
            tenant,
        });
        next(result);
    }
);

router.get(
    "/:userId",
    async (req: Request, _: Response, next: NextFunction) => {
        const { userId } = req.params;
        const result = await _getUserById(userId);
        next(result);
    }
);

router.get(
    "/:userId/without-department",
    async (req: Request, _: Response, next: NextFunction) => {
        const { userId } = req.params;
        const result = await __getUserById(userId);
        next(result);
    }
);

router.put(
    "/update/:userId",
    async (req: Request, _: Response, next: NextFunction) => {
        const body: UpdateUserReqBody = req.body;
        const roles: string[] = req.body.userRoles;
        const userId: string = req.body.userId;
        const id = req.params.userId as string;
        const result = await updateUser({
            ...body,
            id: id,
            userId: userId,
            userRoles: roles,
        });
        next(result);
    }
);

router.put(
    "/:userId",
    async (req: Request, _: Response, next: NextFunction) => {
        const { userId } = req.params;
        const tenant = req.body.tenant as string;
        const is_auto = req.body.is_auto as boolean;
        const result = await updateAssigneeTicket({
            id: userId,
            tenant: tenant,
            is_auto: is_auto,
        });
        next(result);
    }
);
