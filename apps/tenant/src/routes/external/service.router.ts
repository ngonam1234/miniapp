import { Payload, matchedBody, matchedQuery } from "app";
import express, { NextFunction, Request, Response } from "express";
import {
    createManySubService,
    createManySubServiceL2,
    createService,
    createSubService,
    createSubServiceL2,
    deleteService,
    deleteSubService,
    deleteSubServiceL2,
    findService,
    getAllSubServiceL2ByService,
    getAllSubServiceL2BySubService,
    getServiceById,
    updateService,
    updateSubService,
    updateSubServiceL2,
} from "../../controllers";
import {
    CreateServiceReqBody,
    UpdateServiceReqBody,
    CreateSubServiceReqBody,
    UpdateSubServiceReqBody,
    CreateManySubServiceReqBody,
} from "../../interfaces/request";
import { FindServiceReqQuery } from "../../interfaces/request";
import { verifyRole } from "../../middlewares";
import {
    createManySubServiceValidator,
    createServiceValidator,
    createSubServiceValidator,
    findServiceValidator,
    updateServiceValidator,
    updateSubServiceValidator,
} from "../../validator";

export const router = express.Router();

router.post(
    "/",
    verifyRole("TA", "SA"),
    createServiceValidator(),
    async (req: Request, _: Response, next: NextFunction) => {
        const roles = req.payload?.roles as string[];
        const body: CreateServiceReqBody = matchedBody(req);
        const tenant = req.query.tenant as string;
        const result = await createService({
            ...body,
            tenant,
            userRoles: roles,
        });
        next(result);
    }
);

/* Updating the service. */
router.put(
    "/:serviceId",
    verifyRole("TA", "SA"),
    updateServiceValidator(),
    async (req: Request, _: Response, next: NextFunction) => {
        const body: UpdateServiceReqBody = matchedBody(req);
        const serviceId = req.params.serviceId as string;
        const {
            id: userId,
            roles: userRoles,
            tenant: userTenant,
        } = req.payload as Payload;
        const result = await updateService({
            ...body,
            serviceId,
            userTenant,
            userId,
            userRoles,
        });
        next(result);
    }
);

router.get(
    "/",
    verifyRole("SA", "TA"),
    findServiceValidator(),
    async (req: Request, _: Response, next: NextFunction) => {
        const { roles, id } = req.payload as Payload;
        const query: FindServiceReqQuery = matchedQuery(req);
        const result = await findService({
            ...query,
            userId: id,
            userRoles: roles,
        });
        next(result);
    }
);

router.get(
    "/:serviceId",
    verifyRole("TA", "SA"),
    async (req: Request, _: Response, next: NextFunction) => {
        const serviceId = req.params.serviceId as string;
        const {
            id: userId,
            roles: userRoles,
            tenant: userTenant,
        } = req.payload as Payload;
        const result = await getServiceById({
            serviceId,
            userTenant,
            userId,
            userRoles,
        });
        next(result);
    }
);

router.delete(
    "/:serviceId",
    verifyRole("TA", "SA"),
    async (req: Request, _: Response, next: NextFunction) => {
        const serviceId = req.params.serviceId as string;
        const { tenant: userTenant } = req.payload as Payload;
        const result = await deleteService({
            serviceId,
            userTenant,
        });
        next(result);
    }
);

router.post(
    "/:serviceId/sub-services",
    verifyRole("TA", "SA"),
    createSubServiceValidator(),
    async (req: Request, _: Response, next: NextFunction) => {
        const serviceId = req.params.serviceId as string;
        const body: CreateSubServiceReqBody = matchedBody(req);
        const { tenant: userTenant } = req.payload as Payload;
        const result = await createSubService({
            serviceId,
            ...body,
            userTenant,
        });
        next(result);
    }
);

router.post(
    "/:serviceId/sub-services-many",
    verifyRole("TA", "SA"),
    createManySubServiceValidator(),
    async (req: Request, _: Response, next: NextFunction) => {
        const serviceId = req.params.serviceId as string;
        const body: CreateManySubServiceReqBody = matchedBody(req);
        const { tenant: userTenant } = req.payload as Payload;
        const result = await createManySubService({
            serviceId,
            ...body,
            userTenant,
        });
        next(result);
    }
);

router.put(
    "/sub_services/:subServiceId",
    verifyRole("TA", "SA"),
    updateSubServiceValidator(),
    async (req: Request, _: Response, next: NextFunction) => {
        const body: UpdateSubServiceReqBody = matchedBody(req);
        const subServiceId = req.params.subServiceId as string;
        const {
            id: userId,
            roles: userRoles,
            tenant: userTenant,
        } = req.payload as Payload;
        const result = await updateSubService({
            ...body,
            subServiceId,
            userTenant,
            userId,
            userRoles,
        });
        next(result);
    }
);

router.delete(
    "/sub_services/:subServiceId",
    verifyRole("TA", "SA"),
    async (req: Request, _: Response, next: NextFunction) => {
        const subServiceId = req.params.subServiceId as string;
        const { tenant: userTenant } = req.payload as Payload;
        const result = await deleteSubService({
            subServiceId,
            userTenant,
        });
        next(result);
    }
);

router.post(
    "/sub_services/:subServiceId/sub-services-l2",
    verifyRole("TA", "SA"),
    createSubServiceValidator(),
    async (req: Request, _: Response, next: NextFunction) => {
        const subServiceId = req.params.subServiceId as string;
        const body: CreateSubServiceReqBody = matchedBody(req);
        const { roles, tenant, id } = req.payload as Payload;
        const result = await createSubServiceL2({
            subServiceId,
            ...body,
            userRoles: roles,
            userId: id,
            userTenant: tenant,
        });
        next(result);
    }
);

router.post(
    "/sub_services/:subServiceId/sub-services-l2-many",
    verifyRole("TA", "SA"),
    createManySubServiceValidator(),
    async (req: Request, _: Response, next: NextFunction) => {
        const subServiceId = req.params.subServiceId as string;
        const body: CreateManySubServiceReqBody = matchedBody(req);
        const { roles, tenant, id } = req.payload as Payload;
        const result = await createManySubServiceL2({
            subServiceId,
            ...body,
            userRoles: roles,
            userId: id,
            userTenant: tenant,
        });
        next(result);
    }
);

router.put(
    "/sub_services/sub-services-l2/:subServiceL2Id",
    verifyRole("TA", "SA"),
    updateSubServiceValidator(),
    async (req: Request, _: Response, next: NextFunction) => {
        const body: UpdateSubServiceReqBody = matchedBody(req);
        const subServiceL2Id = req.params.subServiceL2Id as string;
        const {
            id: userId,
            roles: userRoles,
            tenant: userTenant,
        } = req.payload as Payload;
        const result = await updateSubServiceL2({
            ...body,
            subServiceL2Id,
            userTenant,
            userId,
            userRoles,
        });
        next(result);
    }
);

router.delete(
    "/sub_services/sub-services-l2/:subServiceL2Id",
    verifyRole("TA", "SA"),
    async (req: Request, _: Response, next: NextFunction) => {
        const subServiceL2Id = req.params.subServiceL2Id as string;
        const {
            id: userId,
            roles: userRoles,
            tenant: userTenant,
        } = req.payload as Payload;
        const result = await deleteSubServiceL2({
            subServiceL2Id,
            userTenant,
            userId,
            userRoles,
        });
        next(result);
    }
);

router.get(
    "/sub-services/:subServiceId?/sub-services-l2",
    verifyRole("TA", "SA"),
    async (req: Request, _: Response, next: NextFunction) => {
        const tenant = req.query.tenant as string | undefined;
        const subServiceId = req.params.subServiceId as string | undefined;
        const result = await getAllSubServiceL2BySubService({
            subServiceId,
            tenant,
        });
        next(result);
    }
);

router.get(
    "/:serviceId?/sub-services/sub-services-l2",
    verifyRole("TA", "SA"),
    async (req: Request, _: Response, next: NextFunction) => {
        const tenant = req.query.tenant as string | undefined;
        const serviceId = req.params.serviceId as string | undefined;
        const result = await getAllSubServiceL2ByService({ serviceId, tenant });
        next(result);
    }
);
