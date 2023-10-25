import { Payload, matchedQuery } from "app";
import express, { NextFunction, Request, Response } from "express";
import {
    createTemplate,
    findTemplate,
    getTemplateById,
    getTemplateWithRoles,
    getTemplateCategories,
    getTemplateChannels,
    getTemplateGroups,
    getTemplatePriorities,
    getTemplateServices,
    getTemplateStatus,
    getTemplateSubCategories,
    getTemplateSubService,
    getTemplateTypes,
    getTemplateRequester,
    getTemplateTechnicians,
    getTemplateSubServiceL2,
    getDepartments,
} from "../../controllers";
import { FindReqQuery } from "../../interfaces/request";
import { verifyRole, verifyTenantUser } from "../../middlewares";
import { createTemplateValidator, findValidator } from "../../validator";

export const router = express.Router();

router.post(
    "/",
    verifyRole("SA", "TA", "L*"),
    createTemplateValidator(),
    async (req: Request, _: Response, next: NextFunction) => {
        const { roles, id } = req.payload as Payload;
        const { name, description, tenant } = req.body;
        const result = await createTemplate({
            name,
            description,
            tenant,
            userRoles: roles,
            userId: id as string,
        });
        next(result);
    }
);

router.get(
    "/",
    verifyRole("*"),
    findValidator(),
    async (req: Request, _: Response, next: NextFunction) => {
        const query: FindReqQuery = matchedQuery(req);
        const result = await findTemplate(query);
        next(result);
    }
);

router.get(
    "/:templateId",
    verifyRole("SA", "TA", "L*"),
    async (req: Request, _: Response, next: NextFunction) => {
        const { tenant } = req.payload as Payload;
        const { templateId } = req.params;
        const result = await getTemplateById({
            templateId,
            tenant,
        });
        next(result);
    }
);

router.get(
    "/:templateId/info",
    verifyTenantUser,
    async (req: Request, _: Response, next: NextFunction) => {
        const { tenant, roles } = req.payload as Payload;
        const { templateId } = req.params;
        const result = await getTemplateWithRoles({
            templateId,
            tenant,
            roles,
        });
        next(result);
    }
);

router.get(
    "/:templateId/status",
    verifyTenantUser,
    async (req: Request, _: Response, next: NextFunction) => {
        const { tenant } = req.payload as Payload;
        const { templateId } = req.params;
        const result = await getTemplateStatus({
            tenant,
            templateId,
        });
        next(result);
    }
);

router.get(
    "/:templateId/types",
    verifyTenantUser,
    async (req: Request, _: Response, next: NextFunction) => {
        const { tenant } = req.payload as Payload;
        const { templateId } = req.params;
        const result = await getTemplateTypes({
            tenant,
            templateId,
        });
        next(result);
    }
);

router.get(
    "/:templateId/channels",
    verifyTenantUser,
    async (req: Request, _: Response, next: NextFunction) => {
        const { tenant } = req.payload as Payload;
        const { templateId } = req.params;
        const result = await getTemplateChannels({
            tenant,
            templateId,
        });
        next(result);
    }
);

router.get(
    "/:templateId/priorities",
    verifyTenantUser,
    async (req: Request, _: Response, next: NextFunction) => {
        const { tenant } = req.payload as Payload;
        const { templateId } = req.params;
        const result = await getTemplatePriorities({
            tenant,
            templateId,
        });
        next(result);
    }
);

router.get(
    "/:templateId/services",
    verifyTenantUser,
    async (req: Request, _: Response, next: NextFunction) => {
        const { tenant, roles } = req.payload as Payload;
        const { templateId } = req.params;
        const result = await getTemplateServices({
            tenant,
            templateId,
            userRoles: roles,
        });
        next(result);
    }
);

router.get(
    "/:templateId/services/:serviceId/sub-services",
    verifyTenantUser,
    async (req: Request, _: Response, next: NextFunction) => {
        const { tenant } = req.payload as Payload;
        const { templateId, serviceId } = req.params;
        const result = await getTemplateSubService({
            tenant,
            templateId,
            serviceId,
        });
        next(result);
    }
);

router.get(
    "/:templateId/services/sub-services/:sub_serviceId/sub-services-l2",
    verifyTenantUser,
    async (req: Request, _: Response, next: NextFunction) => {
        const { templateId, sub_serviceId } = req.params;
        const result = await getTemplateSubServiceL2({
            templateId,
            sub_serviceId,
        });
        next(result);
    }
);

router.get(
    "/:templateId/services/:serviceId/categories",
    verifyTenantUser,
    async (req: Request, _: Response, next: NextFunction) => {
        const { tenant } = req.payload as Payload;
        const { templateId, serviceId } = req.params;
        const result = await getTemplateCategories({
            tenant,
            templateId,
            serviceId,
        });
        next(result);
    }
);

router.get(
    "/:templateId/categories/:categoryId/sub-categories",
    verifyTenantUser,
    async (req: Request, _: Response, next: NextFunction) => {
        const { tenant } = req.payload as Payload;
        const { templateId, categoryId } = req.params;
        const result = await getTemplateSubCategories({
            tenant,
            templateId,
            categoryId,
        });
        next(result);
    }
);

router.get(
    "/:templateId/groups",
    verifyTenantUser,
    async (req: Request, _: Response, next: NextFunction) => {
        const { tenant } = req.payload as Payload;
        const { templateId } = req.params;
        const result = await getTemplateGroups({
            tenant,
            templateId,
        });
        next(result);
    }
);

router.get(
    "/:templateId/groups/:groupId/members",
    verifyTenantUser,
    async (req: Request, _: Response, next: NextFunction) => {
        const { tenant } = req.payload as Payload;
        const { templateId, groupId } = req.params;
        const result = await getTemplateTechnicians({
            tenant,
            templateId,
            groupId,
        });
        next(result);
    }
);

router.get(
    "/:templateId/requesters",
    verifyTenantUser,
    async (req: Request, _: Response, next: NextFunction) => {
        const query = req.query.query as string | undefined;
        const { tenant } = req.payload as Payload;
        const { templateId } = req.params;
        const result = await getTemplateRequester({
            tenant: tenant as string,
            templateId,
            query,
        });
        next(result);
    }
);
