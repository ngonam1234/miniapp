import { Payload, matchedBody, matchedQuery } from "app";
import express, { NextFunction, Request, Response } from "express";
import {
    createCategory,
    createSubCategory,
    deleteCategory,
    deleteSubCategory,
    findCategory,
    getCategoryById,
    updateCategory,
    updateSubCategory,
} from "../../controllers";
import {
    CreateCategoryReqBody,
    CreateSubCategoryReqBody,
    FindCategoryReqQuery,
    UpdateCategoryReqBody,
    UpdateSubCategoryReqBody,
} from "../../interfaces/request";
import { verifyRole } from "../../middlewares";
import {
    createCategoryValidator,
    createSubCategoryValidator,
    findCategoryValidator,
    updateCategoryValidator,
    updateSubCategoryValidator,
} from "../../validator";

export const router = express.Router();

router.get(
    "/",
    verifyRole("SA", "TA"),
    findCategoryValidator(),
    async (req: Request, _: Response, next: NextFunction) => {
        const { roles, id, tenant } = req.payload as Payload;
        const query: FindCategoryReqQuery = matchedQuery(req);
        const result = await findCategory({
            ...query,
            userId: id,
            userRoles: roles,
            userTenant: tenant,
        });
        next(result);
    }
);

router.post(
    "/",
    verifyRole("TA", "SA"),
    createCategoryValidator(),
    async (req: Request, _: Response, next: NextFunction) => {
        const body: CreateCategoryReqBody = matchedBody(req);
        const { tenant: userTenant } = req.payload as Payload;
        const result = await createCategory({
            ...body,
            userTenant,
        });
        next(result);
    }
);

router.put(
    "/:categoryId",
    verifyRole("TA", "SA"),
    updateCategoryValidator(),
    async (req: Request, _: Response, next: NextFunction) => {
        const body: UpdateCategoryReqBody = matchedBody(req);
        const categoryId = req.params.categoryId as string;
        const {
            id: userId,
            roles: userRoles,
            tenant: userTenant,
        } = req.payload as Payload;
        const result = await updateCategory({
            ...body,
            categoryId,
            userTenant,
            userId,
            userRoles,
        });
        next(result);
    }
);

router.get(
    "/:categoryId",
    verifyRole("TA", "SA"),
    async (req: Request, _: Response, next: NextFunction) => {
        const categoryId = req.params.categoryId as string;
        const {
            id: userId,
            roles: userRoles,
            tenant: userTenant,
        } = req.payload as Payload;
        const result = await getCategoryById({
            categoryId,
            userTenant,
            userId,
            userRoles,
        });
        next(result);
    }
);

router.delete(
    "/:categoryId",
    verifyRole("TA", "SA"),
    async (req: Request, _: Response, next: NextFunction) => {
        const categoryId = req.params.categoryId as string;
        const { tenant: userTenant } = req.payload as Payload;
        const result = await deleteCategory({
            categoryId,
            userTenant,
        });
        next(result);
    }
);

router.post(
    "/:categoryId/sub_categories",
    verifyRole("TA", "SA"),
    createSubCategoryValidator(),
    async (req: Request, _: Response, next: NextFunction) => {
        const categoryId = req.params.categoryId as string;
        const body: CreateSubCategoryReqBody = matchedBody(req);
        const { tenant: userTenant } = req.payload as Payload;
        const result = await createSubCategory({
            categoryId,
            ...body,
            userTenant,
        });
        next(result);
    }
);

router.put(
    "/sub_categories/:subCategoryId",
    verifyRole("TA", "SA"),
    updateSubCategoryValidator(),
    async (req: Request, _: Response, next: NextFunction) => {
        const body: UpdateSubCategoryReqBody = matchedBody(req);
        const subCategoryId = req.params.subCategoryId as string;
        const { tenant: userTenant } = req.payload as Payload;
        const result = await updateSubCategory({
            ...body,
            subCategoryId,
            userTenant,
        });
        next(result);
    }
);

router.delete(
    "/sub_categories/:subCategoryId",
    verifyRole("TA", "SA"),
    async (req: Request, _: Response, next: NextFunction) => {
        const subCategoryId = req.params.subCategoryId as string;
        const { tenant: userTenant } = req.payload as Payload;
        const result = await deleteSubCategory({
            subCategoryId,
            userTenant,
        });
        next(result);
    }
);
