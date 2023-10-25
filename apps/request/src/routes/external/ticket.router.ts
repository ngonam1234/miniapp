import {
    HttpError,
    HttpStatus,
    Payload,
    error,
    matchedBody,
    matchedQuery,
    validate,
} from "app";
import express, { NextFunction, Request, Response } from "express";
import Joi from "joi";
import {
    createTicket,
    exportTicketSLA,
    exportTicketsSLAPdf,
    findTicket,
    findTicketNotConnect,
    findTicketNotConnectIncident,
    findTicketWithAdvancedFilter,
    getRequester,
    getTemplateUrl,
    getTicketById,
    getTicketCategories,
    getTicketChannels,
    getTicketGroups,
    getTicketPriorities,
    getTicketResolution,
    getTicketServices,
    getTicketStatus,
    getTicketSubCategories,
    getTicketSubService,
    getTicketSubServiceL2,
    getTicketTaskTypes,
    getTicketTechnicians,
    getTicketTypes,
    getTicketsJson,
    importTickets,
    updateTicketResolution,
} from "../../controllers";
import {
    commentTicket,
    editComment,
    replyTicket,
    showComment,
} from "../../controllers/ticket.controller/comment.ticket";
import { updateTicket } from "../../controllers/ticket.controller/update.ticket";
import {
    CommentTicketReqBody,
    CreateManyTicketReqBody,
    CreateTicketReqBody,
    EditCommentTicketReqBody,
    ExportReqQuery,
    ExportTicketSLAReqQuery,
    FindReqQuery,
    FindTicketNotConnectReqQuery,
    FindTicketReqQuery,
    FindTicketWithAdvancedFilterReqQuery,
    UpdateResolutionReqBody,
    UpdateTicketReqBody,
    UpdateTicketStatusReqBody,
} from "../../interfaces/request";
import { verifyRole, verifyTenantUser } from "../../middlewares";
import {
    createTicketValidator,
    findTicketNotConnectValidator,
    findValidator,
    updateTicketResolutionSchema,
    updateTicketStatusValidator,
} from "../../validator";
import {
    commentTicketValidator,
    editCommentTicketValidator,
    exportTicketSLAValidator,
    findTicketValidator,
    findTicketWithAdvancedFilterValidator,
    importTicketValidator,
    updateTicketValidator,
} from "./../../validator/ticket.validator";

export const router = express.Router();

router.get(
    "/import-template",
    // verifyRole("TA"),
    async (_: Request, __: Response, next: NextFunction) => {
        const result = await getTemplateUrl();
        next(result);
    }
);

router.post(
    "/",
    verifyTenantUser,
    createTicketValidator(),
    async (req: Request, _: Response, next: NextFunction) => {
        const { tenant, id, roles } = req.payload as Payload;
        const body: CreateTicketReqBody = matchedBody(req);
        const result = await createTicket({
            tenant: tenant as string,
            userRoles: roles,
            userId: id,
            ...body,
        });
        next(result);
    }
);

router.get(
    "/",
    verifyTenantUser,
    findTicketValidator(),
    async (req: Request, _: Response, next: NextFunction) => {
        const { tenant, roles, id } = req.payload as Payload;
        const query: FindTicketReqQuery = matchedQuery(req);
        const result = await findTicket({
            userRoles: roles,
            userTenant: tenant,
            userId: id,
            ...query,
        });
        next(result);
    }
);

router.get(
    "/requesters",
    verifyRole("SA", "TA", "L*", "EU"),
    async (req: Request, _: Response, next: NextFunction) => {
        const query = req.query.query as string | undefined;
        const size = req.query.size as number | undefined;
        const { tenant } = req.payload as Payload;
        const result = await getRequester({
            tenant: tenant as string,
            size,
            query,
        });
        next(result);
    }
);

// TODO: check api is unused
router.get(
    "/export/json",
    verifyTenantUser,
    findTicketValidator(),
    async (req: Request, _: Response, next: NextFunction) => {
        const { tenant, roles, id } = req.payload as Payload;
        const query: ExportReqQuery = matchedQuery(req);
        const result = await getTicketsJson({
            userRoles: roles,
            userTenant: tenant,
            userId: id,
            ...query,
        });
        next(result);
    }
);

router.get(
    "/export",
    verifyTenantUser,
    validate.query(exportTicketSLAValidator),
    async (req: Request, res: Response, _: NextFunction) => {
        const query = req.query as unknown as ExportTicketSLAReqQuery;
        const { tenant, roles, id } = req.payload as Payload;
        const name = `BaoCaoCamKetChatLuongDichVuSLA_${query.start}_${query.end}.${query.file}`;
        res.setHeader("Content-Disposition", `attachment; filename=${name}`);
        if (query.file === "xlsx") {
            res.setHeader(
                "Content-Type",
                "application/ms-excel; charset=utf-16"
            );
            const workbook = await exportTicketSLA({
                ...query,
                userRoles: roles,
                userTenant: tenant,
                userId: id,
            });
            await workbook.xlsx.write(res);
            res.status(HttpStatus.OK).end();
        } else if (query.file === "pdf") {
            res.setHeader("Content-Type", "application/pdf; charset=utf-16");
            console.log("🚀 ~ file: get.ticket.ts:181 ~ da vao roter:");

            const file = await exportTicketsSLAPdf({
                ...query,
                userRoles: roles,
                userTenant: tenant,
                userId: id,
            });
            res.send(file);
            res.status(HttpStatus.OK).end();
        }
    }
);

// router.get(
//     "/export",
//     verifyTenantUser,
//     validate.query(exportTicketValidator),

//     async (req: Request, res: Response, _: NextFunction) => {
//         const query = req.query as unknown as ExportTicketReqQuery;
//         const { tenant, roles, id } = req.payload as Payload;
//         const name = `BaoCaoChiTietYeuCau_${query.start}_${query.end}.${query.file}`;
//         res.setHeader("Content-Disposition", `attachment; filename=${name}`);
//         if (query.file === "xlsx") {
//             res.setHeader(
//                 "Content-Type",
//                 "application/ms-excel; charset=utf-16"
//             );
//             const workbook = await exportTickets({
//                 ...query,
//                 userRoles: roles,
//                 userTenant: tenant,
//                 userId: id,
//             });
//             await workbook.xlsx.write(res);
//             res.status(HttpStatus.OK).end();
//         } else if (query.file === "pdf") {
//             res.setHeader("Content-Type", "application/pdf; charset=utf-16");
//             const file = await exportTicketsPdf({
//                 ...query,
//                 userRoles: roles,
//                 userTenant: tenant,
//                 userId: id,
//             });
//             res.send(file);
//             res.status(HttpStatus.OK).end();
//         }
//     }
// );

router.post(
    "/comment/:id",
    verifyTenantUser,
    commentTicketValidator(),
    verifyRole("EU", "TA", "L*"),
    async (req: Request, _: Response, next: NextFunction) => {
        const { tenant, id: idUser, roles } = req.payload as Payload;
        const body: CommentTicketReqBody = matchedBody(req);
        body.id = req.params.id;
        const result = await commentTicket({
            tenant: tenant as string,
            userRoles: roles,
            userId: idUser,
            ...body,
        });
        next(result);
    }
);

router.get(
    "/comment/:id",
    verifyTenantUser,
    findValidator(),
    verifyRole("EU", "TA", "L*"),
    async (req: Request, _: Response, next: NextFunction) => {
        const { tenant, id: idUser, roles } = req.payload as Payload;
        const query: FindReqQuery = matchedQuery(req);
        const id = req.params.id;
        const result = await showComment({
            id,
            tenant: tenant as string,
            userRoles: roles,
            userId: idUser,
            ...query,
        });
        next(result);
    }
);
router.put(
    "/:id/comment/:id_comment",
    verifyTenantUser,
    editCommentTicketValidator(),
    verifyRole("EU", "TA", "L*"),
    async (req: Request, _: Response, next: NextFunction) => {
        const { tenant, id: idUser, roles } = req.payload as Payload;
        const body: EditCommentTicketReqBody = matchedBody(req);
        body.id = req.params.id;
        body.id_comment = req.params.id_comment;
        const result = await editComment({
            tenant: tenant as string,
            userRoles: roles,
            userId: idUser,
            ...body,
        });
        next(result);
    }
);

router.post(
    "/:id/reply/:reply_comment",
    verifyTenantUser,
    commentTicketValidator(),
    verifyRole("EU", "TA", "L*"),
    async (req: Request, _: Response, next: NextFunction) => {
        const { tenant, id: idUser, roles } = req.payload as Payload;
        const body: CommentTicketReqBody = matchedBody(req);
        body.id = req.params.id;
        body.reply_comment = req.params.reply_comment;
        const result = await replyTicket({
            tenant: tenant as string,
            userRoles: roles,
            userId: idUser,
            ...body,
        });
        next(result);
    }
);

router.get(
    "/advanced-filter",
    verifyTenantUser,
    validate.query(findTicketWithAdvancedFilterValidator),
    async (req: Request, _: Response, next: NextFunction) => {
        const { roles, id } = req.payload as Payload;
        const query =
            req.query as unknown as FindTicketWithAdvancedFilterReqQuery;
        let tenant = req.payload?.tenant;
        if (req.payload?.roles.includes("SA")) {
            tenant = req.query.tenant as typeof tenant;
        }
        tenant = String(validateTenant(tenant));
        const result = await findTicketWithAdvancedFilter({
            userRoles: roles,
            userTenant: tenant,
            userId: id,
            ...query,
        });
        next(result);
    }
);

router.get(
    "/:ticketId/not-connect",
    verifyTenantUser,
    findTicketNotConnectValidator(),
    async (req: Request, _: Response, next: NextFunction) => {
        const { tenant, roles, id } = req.payload as Payload;
        const ticketId = req.params.ticketId as string;
        const query: FindTicketNotConnectReqQuery = matchedQuery(req);
        if (query.type === "request") {
            const result = await findTicketNotConnect({
                userRoles: roles,
                userTenant: tenant,
                userId: id,
                ticketId: ticketId,
                ...query,
            });
            next(result);
        }
        if (query.type === "incident") {
            const result = await findTicketNotConnectIncident({
                userRoles: roles,
                userTenant: tenant,
                userId: id,
                ticketId: ticketId,
                ...query,
            });
            next(result);
        }
    }
);

router.put(
    "/:ticketId/resolution",
    verifyTenantUser,
    validate.body(updateTicketResolutionSchema),
    async (req: Request, _: Response, next: NextFunction) => {
        const { tenant, id, roles } = req.payload as Payload;
        const ticketId = req.params.ticketId as string;
        const body: UpdateResolutionReqBody = req.body;
        const result = await updateTicketResolution({
            ...body,
            ticketId: ticketId,
            tenant: <string>tenant,
            userId: id,
            userRoles: roles,
        });
        next(result);
    }
);

router.get(
    "/:ticketId/resolution",
    verifyTenantUser,
    async (req: Request, _: Response, next: NextFunction) => {
        const { tenant } = req.payload as Payload;
        const ticketId = req.params.ticketId as string;
        const result = await getTicketResolution({
            ticketId: ticketId,
            tenant: <string>tenant,
        });
        next(result);
    }
);

router.put(
    "/:ticketId/status",
    verifyTenantUser,
    updateTicketStatusValidator(),
    async (req: Request, _: Response, next: NextFunction) => {
        const { tenant, id, roles } = req.payload as Payload;
        const ticketId = req.params.ticketId as string;
        const body: UpdateTicketStatusReqBody = matchedBody(req);
        const result = await updateTicket({
            fields: { status: body.status },
            ticketId: ticketId,
            tenant: <string>tenant,
            userRoles: roles,
            note: body.note,
            userId: id,
        });
        next(result);
    }
);

router.get(
    "/:ticketId/status",
    verifyTenantUser,
    async (req: Request, _: Response, next: NextFunction) => {
        const { tenant, id } = req.payload as Payload;
        const ticketId = req.params.ticketId as string;
        const result = await getTicketStatus({
            tenant: <string>tenant,
            userId: id,
            ticketId,
        });
        next(result);
    }
);

router.get(
    "/:ticketId/types",
    verifyTenantUser,
    async (req: Request, _: Response, next: NextFunction) => {
        const { tenant, id } = req.payload as Payload;
        const ticketId = req.params.ticketId as string;
        const result = await getTicketTypes({
            tenant: <string>tenant,
            userId: id,
            ticketId,
        });
        next(result);
    }
);

router.get(
    "/:ticketId/channels",
    verifyTenantUser,
    async (req: Request, _: Response, next: NextFunction) => {
        const { tenant, id } = req.payload as Payload;
        const ticketId = req.params.ticketId as string;
        const result = await getTicketChannels({
            tenant: <string>tenant,
            userId: id,
            ticketId,
        });
        next(result);
    }
);

router.get(
    "/:ticketId/priorities",
    verifyTenantUser,
    async (req: Request, _: Response, next: NextFunction) => {
        const { tenant, id } = req.payload as Payload;
        const ticketId = req.params.ticketId as string;
        const result = await getTicketPriorities({
            tenant: <string>tenant,
            userId: id,
            ticketId,
        });
        next(result);
    }
);
router.get(
    "/:ticketId/task_types",
    verifyTenantUser,
    async (req: Request, _: Response, next: NextFunction) => {
        const { tenant, id } = req.payload as Payload;
        const ticketId = req.params.ticketId as string;
        const result = await getTicketTaskTypes({
            tenant: <string>tenant,
            userId: id,
            ticketId,
        });
        next(result);
    }
);

router.get(
    "/:ticketId/services",
    verifyTenantUser,
    async (req: Request, _: Response, next: NextFunction) => {
        const { tenant, id } = req.payload as Payload;
        const ticketId = req.params.ticketId as string;
        const result = await getTicketServices({
            tenant: <string>tenant,
            userId: id,
            ticketId,
        });
        next(result);
    }
);

router.get(
    "/:ticketId/services/:serviceId/sub-services",
    verifyTenantUser,
    async (req: Request, _: Response, next: NextFunction) => {
        const { tenant, id } = req.payload as Payload;
        const { ticketId, serviceId } = req.params;
        const result = await getTicketSubService({
            tenant: <string>tenant,
            userId: id,
            serviceId,
            ticketId,
        });
        next(result);
    }
);

router.get(
    "/:ticketId/services/sub-services/:sub_serviceId/sub-services-l2",
    verifyTenantUser,
    async (req: Request, _: Response, next: NextFunction) => {
        const { tenant, id } = req.payload as Payload;
        const { ticketId, sub_serviceId } = req.params;
        const result = await getTicketSubServiceL2({
            tenant: <string>tenant,
            userId: id,
            sub_serviceId,
            ticketId,
        });
        next(result);
    }
);

router.get(
    "/:ticketId/services/:serviceId/categories",
    verifyTenantUser,
    async (req: Request, _: Response, next: NextFunction) => {
        const { tenant, id } = req.payload as Payload;
        const { ticketId, serviceId } = req.params;
        const result = await getTicketCategories({
            tenant: <string>tenant,
            userId: id,
            serviceId,
            ticketId,
        });
        next(result);
    }
);

router.get(
    "/:ticketId/categories/:categoryId/sub-categories",
    verifyTenantUser,
    async (req: Request, _: Response, next: NextFunction) => {
        const { tenant, id } = req.payload as Payload;
        const { ticketId, categoryId } = req.params;
        const result = await getTicketSubCategories({
            tenant: <string>tenant,
            userId: id,
            categoryId,
            ticketId,
        });
        next(result);
    }
);

router.get(
    "/:ticketId/groups",
    verifyTenantUser,
    async (req: Request, _: Response, next: NextFunction) => {
        const { tenant, id } = req.payload as Payload;
        const ticketId = req.params.ticketId as string;
        const result = await getTicketGroups({
            tenant: <string>tenant,
            userId: id,
            ticketId,
        });
        next(result);
    }
);

router.get(
    "/:ticketId/groups/:groupId/members",
    verifyTenantUser,
    async (req: Request, _: Response, next: NextFunction) => {
        const { tenant, id } = req.payload as Payload;
        const { ticketId, groupId } = req.params;
        const result = await getTicketTechnicians({
            tenant: <string>tenant,
            userId: id,
            ticketId,
            groupId,
        });
        next(result);
    }
);

router.post(
    "/import-tickets",
    verifyTenantUser,
    importTicketValidator(),
    verifyRole("TA"),
    async (req: Request, _: Response, next: NextFunction) => {
        const { tenant, id, roles } = req.payload as Payload;
        const tickets: CreateManyTicketReqBody = req.body;
        const result = await importTickets({
            importData: tickets,
            tenant: tenant as string,
            userId: id,
            userRoles: roles,
        });
        next(result);
    }
);

router.get(
    "/:ticketId",
    verifyTenantUser,
    async (req: Request, _: Response, next: NextFunction) => {
        const { tenant, roles, id } = req.payload as Payload;
        const ticketId = req.params.ticketId as string;
        const result = await getTicketById({
            userRoles: roles,
            ticketId,
            tenant,
            userId: id,
        });
        next(result);
    }
);

router.put(
    "/:ticketId",
    verifyTenantUser,
    updateTicketValidator(),
    async (req: Request, _: Response, next: NextFunction) => {
        const { tenant, id, roles } = req.payload as Payload;
        const ticketId = req.params.ticketId as string;
        const body: UpdateTicketReqBody = matchedBody(req);
        const result = await updateTicket({
            ...body,
            ticketId: ticketId,
            tenant: <string>tenant,
            userId: id,
            userRoles: roles,
        });
        next(result);
    }
);
function validateTenant(
    tenant: unknown,
    required = true,
    location = "query"
): never | string | undefined {
    const rule = { tenant: Joi.string() };
    required && rule.tenant.required();
    const schema = Joi.object(rule);
    const result = schema.validate({ tenant });

    if (result.error) {
        let message = result.error.message;
        message = message.replace('"tenant"', "'tenant'");
        throw new HttpError(
            error.invalidData({
                location,
                param: "tenant",
                value: tenant,
                message,
            })
        );
    }
    return tenant as string | undefined;
}
