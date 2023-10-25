import express, { NextFunction, Request, Response, Router } from "express";
import {
    addMemberToDepartment,
    createDepartment,
    findDepartmentById,
    getAllDepartment,
    getDepartmentByIds,
    removeMemberFromDepartment,
} from "../../controllers";
import {
    createDepartmentValidator,
    findDepartmentByIdsValidator,
} from "../../validator";
import { CreatedDepartmentReqbody } from "../../interfaces/request";

export const router: Router = express.Router();

router.post(
    "/",
    createDepartmentValidator(),
    async (req: Request, _: Response, next: NextFunction) => {
        const department = req.body as CreatedDepartmentReqbody;
        const result = await createDepartment({
            ...department,
        });
        next(result);
    }
);

router.get("/", async (req: Request, _: Response, next: NextFunction) => {
    const tenant = req.query.tenant as string;
    const result = await getAllDepartment(tenant);
    next(result);
});

router.post(
    "/get-by-ids",
    findDepartmentByIdsValidator(),
    async (req: Request, _: Response, next: NextFunction) => {
        const { ids } = req.body;
        const result = await getDepartmentByIds(ids);
        next(result);
    }
);

router.get("/:id", async (req: Request, _: Response, next: NextFunction) => {
    const result = await findDepartmentById({
        id: req.params.id,
        is_internal: false,
    });
    next(result);
});

// TODO write validator
router.post(
    "/:department/members/add",
    async (req: Request, _: Response, next: NextFunction) => {
        const department = req.params.department;
        const result = await addMemberToDepartment({
            department: department,
            user: req.body.user,
        });
        next(result);
    }
);

// TODO write validator
router.post(
    "/:department/members/remove",
    async (req: Request, _: Response, next: NextFunction) => {
        const department = req.params.department;
        const result = await removeMemberFromDepartment({
            department: department,
            user: req.body.user,
        });
        next(result);
    }
);
