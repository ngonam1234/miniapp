import { FindGroupByNameReqQuery } from "../../interfaces/request";
import express, { NextFunction, Request, Response } from "express";
import {
    getAllGroup,
    getGroupById,
    getGroupByName,
    getGroupByUser,
    getIdByNameGroup,
    membersOfGroup,
    removeMemberFromGroup,
} from "../../controllers";

export const router = express.Router();

router.get("/", async (req: Request, _: Response, next: NextFunction) => {
    const tenant = req.query.tenant as string | undefined;
    const result = await getAllGroup({ tenant });
    next(result);
});

router.get(
    "/get-by-name",
    async (req: Request, _: Response, next: NextFunction) => {
        const { name, tenant } =
            req.query as unknown as FindGroupByNameReqQuery;
        const result = await getGroupByName({ name, tenant });
        next(result);
    }
);

router.get(
    "/get-id-by-name/:name",
    async (req: Request, _: Response, next: NextFunction) => {
        const name = req.params.name;
        const result = await getIdByNameGroup(name);
        next(result);
    }
);

router.get(
    "/:groupId/members",
    async (req: Request, _: Response, next: NextFunction) => {
        const tenant = req.query.tenant as string | undefined;
        const groupId: string = req.params.groupId;
        const result = await membersOfGroup({ groupId, tenant });
        next(result);
    }
);

router.get(
    "/:userId/groups",
    async (req: Request, _: Response, next: NextFunction) => {
        const userId: string = req.params.userId;
        const result = await getGroupByUser({ userId });
        next(result);
    }
);

router.get(
    "/:groupId",
    async (req: Request, _: Response, next: NextFunction) => {
        const tenant = req.query.tenant as string | undefined;
        const groupId = req.params.groupId;
        const result = await getGroupById({
            userRoles: ["SA"],
            tenant: tenant,
            groupId,
        });
        next(result);
    }
);

router.put(
    "/:userId/remove-member",
    async (req: Request, _: Response, next: NextFunction) => {
        const member = req.params.userId;
        const result = await removeMemberFromGroup(member);
        next(result);
    }
);
