import {
    deleteDepartment,
    deleteDepartments,
    importDepartments,
    updateDepartment,
} from "../../controllers/department.controller";
import {
    DeleteDepartmentReqBody,
    ImportDepartmentReqBody,
    UpdateDepartmentsReqBody,
} from "../../interfaces/request/department.body";
import { NextFunction, Request, Response, Router } from "express";
import {
    addRelationship,
    createDepartment,
    findDepartmentById,
    getDepartments,
    getParentDepartment,
    getSubDepartment,
    removeRelationship,
} from "../../controllers";
import {
    createDepartmentValidator,
    deleteDepartmentValidator,
    findDepartmentValidator,
    importDepartmentValidator,
    updateDepartmentValidator,
} from "../../validator";
import { verifyRole } from "../../middlewares";
import {
    AddRelationshipReqbody,
    CreatedDepartmentReqbody,
    RemoveRelationship,
    searchDepartment,
} from "../../interfaces/request";
import { Payload, matchedBody, matchedQuery } from "app";

export const router: Router = Router();

router.delete(
    "/:id",
    verifyRole("SA", "TA"),
    async (req: Request, _: Response, next: NextFunction) => {
        const id = req.params.id as unknown as string;
        const result = await deleteDepartment(id);
        next(result);
    }
);

router.post(
    "/",
    verifyRole("SA", "TA"),
    createDepartmentValidator(),
    async (req: Request, _: Response, next: NextFunction) => {
        const tenant = req.query.tenant as string;
        const department: CreatedDepartmentReqbody = matchedBody(req);
        const result = await createDepartment({
            ...department,
            tenant: tenant,
        });
        next(result);
    }
);

router.post(
    "/import-file",
    verifyRole("SA", "TA"),
    importDepartmentValidator(),
    async (req: Request, _: Response, next: NextFunction) => {
        const department: ImportDepartmentReqBody = req.body;
        const result = await importDepartments(department);
        next(result);
    }
);

router.post(
    "/delete-many",
    verifyRole("SA", "TA"),
    deleteDepartmentValidator(),
    async (req: Request, _: Response, next: NextFunction) => {
        const body: DeleteDepartmentReqBody = matchedBody(req);
        const result = await deleteDepartments({
            ...body,
        });
        next(result);
    }
);

router.get(
    "/",
    verifyRole("SA", "TA", "L*"),
    findDepartmentValidator(),
    async (req: Request, _: Response, next: NextFunction) => {
        const query: searchDepartment = matchedQuery(req);
        const { id, roles } = req.payload as Payload;
        const result = await getDepartments({
            ...query,
            userId: id,
            userRoles: roles,
        });
        next(result);
    }
);

router.get(
    "/:id",
    verifyRole("SA", "TA"),
    async (req: Request, _: Response, next: NextFunction) => {
        const result = await findDepartmentById({
            id: req.params.id,
            is_internal: true,
        });
        next(result);
    }
);

router.get(
    "/get-parent/:id",
    verifyRole("SA", "TA"),
    async (req: Request, _: Response, next: NextFunction) => {
        const tenant = req.query.tenant as string;
        const result = await getParentDepartment(req.params.id, tenant);
        next(result);
    }
);

router.get(
    "/get-sub/:id",
    verifyRole("SA", "TA"),
    async (req: Request, _: Response, next: NextFunction) => {
        const tenant = req.query.tenant as string;
        const result = await getSubDepartment(req.params.id, tenant);
        next(result);
    }
);

router.put(
    "/remove-relationship",
    verifyRole("SA", "TA"),
    async (req: Request, _: Response, next: NextFunction) => {
        const { tenant, department, child_department } =
            req.body as unknown as RemoveRelationship;
        const result = await removeRelationship({
            tenant: tenant,
            department: department,
            child_department: child_department,
        });
        next(result);
    }
);

router.put(
    "/add-relationship",
    verifyRole("SA", "TA"),
    async (req: Request, _: Response, next: NextFunction) => {
        const { parent, tenant, sub_department } =
            req.body as unknown as AddRelationshipReqbody;
        const result = await addRelationship({
            tenant: tenant,
            parent: parent,
            sub_department: sub_department,
        });
        next(result);
    }
);

router.put(
    "/:id",
    verifyRole("SA", "TA"),
    updateDepartmentValidator(),
    async (req: Request, _: Response, next: NextFunction) => {
        const body: UpdateDepartmentsReqBody = matchedBody(req);
        const id = req.params.id as string;
        const payload = req.payload as Payload;
        const result = await updateDepartment({
            ...body,
            id,
            updated_by: payload.id,
        });
        next(result);
    }
);
