import {
    IPeople,
    ITemplateDetail,
    IWorkflowDetail,
} from "../../interfaces/models";
import { getPossibleStatus, transformTemplate } from "../common.controller";
import { error, HttpError, HttpStatus, Result, success } from "app";
import {
    CreateTicketReqBody,
    CreateTicketReqBodyIn,
    ImportTicketBody,
    ImportTicketsBody,
} from "../../interfaces/request";
import { Template, Ticket, Workflow } from "../../models";
import { workflowDetailPipeline } from "../workflow.controller";
import { templateDetailPipeline } from "../template.controller";
import { getFileAttachments, getRequesterCreator } from "./common.ticket";
import { actionSendMail } from "action-mail";
import { v1 } from "uuid";
import { buildTicketDocument } from "./build.ticket";
import {
    findRoleByIds,
    findMatchingSlaForTicket,
    getDownloadLinks,
    getGroupById,
    getGroupByName,
    getNextTicketNumber,
    getUserByEmail,
    findMatchingAutoForTicket,
    updateTimeAssignee,
} from "../../service";
import logger from "logger";
import { configs } from "../../configs";
import { RoleType } from "../../interfaces/response";

export async function createTicket(
    params: CreateTicketReqBody & {
        tenant: string;
        userId: string;
        userRoles: string[];
    }
): Promise<Result> {
    let isEndUser = false;
    let isCreator = false;
    const response = await findRoleByIds(params.userRoles, params.tenant);
    if (response.status === HttpStatus.OK) {
        const roles = response.body;
        if (roles && roles.length > 0) {
            isCreator = roles.some((role) => role.request_permission.add);
            isEndUser = roles.some(
                (role) =>
                    role.type === RoleType.CUSTOMER ||
                    (role.type === RoleType.DEFAULT && role.id === "EU")
            );
        }
    }
    if (!isCreator) {
        return error.actionNotAllowed();
    }
    const template = await getTemplateDetail({
        tenant: params.tenant,
        templateId: params.template,
    });

    const [workflow, { requester, creator }, attachments] = await Promise.all([
        getWorkflowDetail({
            tenant: params.tenant,
            templateId: params.template,
            workflowId: template.workflow,
        }),
        getRequesterCreator(params.tenant, params.userId, params.requester),
        getFileAttachments(params.attachments),
    ]);
    const ticket = new Ticket({
        id: v1(),
        name: params.name,
        description: params.description,
        template: template,
        workflow: workflow,
        attachments: params.attachments,
        tenant: params.tenant,
        created_time: new Date(),
        creator: creator,
        requester: requester ? requester : creator,
        activities: [],
    });

    const edge = ticket.workflow.edges[0];

    const [possibleStatus] = await Promise.all([
        getPossibleStatus(ticket.workflow, ticket.status?.id),
        buildTicketDocument(ticket, params.fields, isEndUser, creator, true),
    ]);
    const identityKey = `${params.tenant}:request:ticket`;
    const [ticketNumberRes, matchedSlaRes] = await Promise.all([
        getNextTicketNumber({ key: identityKey }),
        findMatchingSlaForTicket(ticket.toObject()),
    ]);

    if (!ticketNumberRes.body?.number) {
        return error.service(ticketNumberRes.path);
    }
    if (matchedSlaRes.body) {
        const sla = matchedSlaRes.body;
        let resOverdueTime = undefined;
        if (sla.response_assurance?.overdue_time) {
            resOverdueTime = new Date(sla.response_assurance.overdue_time);
        }
        let revOverdueTime = undefined;
        if (sla.resolving_assurance?.overdue_time) {
            revOverdueTime = new Date(sla.resolving_assurance.overdue_time);
        }
        const response_assurance = sla.response_assurance && {
            ...sla.response_assurance,
            overdue_time: resOverdueTime,
        };
        const resolving_assurance = sla.resolving_assurance && {
            ...sla.resolving_assurance,
            overdue_time: revOverdueTime,
        };
        ticket.sla = {
            ...sla,
            response_assurance,
            resolving_assurance,
        };
    }
    ticket.number = `REQ${ticketNumberRes.body.number}`;
    actionSendMail(
        ticket.toObject(),
        edge.source,
        edge.target,
        "request",
        creator.email,
        configs.email.link as string
    );
    if (ticket.technician) {
        try {
            await updateTimeAssignee(
                ticket.technician.id,
                ticket.technician.tenant as string,
                false
            );
        } catch (error) {
            logger.info("Some thing error updateTimeAssignee %o", error);
        }
    }

    const check = await findMatchingAutoForTicket(ticket, "CREATE", "REQUEST");
    if (check.body?.id && !ticket.technician?.id) {
        try {
            ticket.technician = check.body as unknown as IPeople;
            // await ticket.save()
            // const groupId = await getGroupIdsByUserId({
            //     userId: check.body?.id,
            // });
            const group = await getGroupById({
                tenant: params.tenant,
                group: check.body?.group?.id as string,
            });
            ticket.group = {
                id: group.body?.id as string,
                name: group.body?.name as string,
            };
            await updateTimeAssignee(
                check.body?.id as string,
                ticket.tenant as string,
                true
            );
        } catch (error) {
            logger.info("something error in match auto %o", error);
        }
    }

    await ticket.save();

    const transformOutput = transformTemplate({
        template: ticket.template,
        resourceId: ticket.id,
        isEndUser: isEndUser,
    });
    const next_status = possibleStatus.filter(
        (s) => s.id !== ticket.status?.id
    );
    const result = {
        ...ticket.toJSON(),
        ...transformOutput,
        _id: undefined,
        attachments,
        next_status,
    };
    return success.created(result);
}

export async function createTicketIn(
    params: CreateTicketReqBodyIn
): Promise<Result> {
    // default value
    params.template = "837ab94e-efe3-11ed-a05b-0242ac120003"; // Default template DVC

    const template = await getTemplateDetail({
        tenant: params.tenant,
        templateId: params.template,
    });

    function handleRes(res: { body?: { id: string }; url: string }): string {
        if (res.body?.id) {
            return res.body?.id;
        } else {
            throw new HttpError(error.service(res.url));
        }
    }
    const [userId, technician, group] = await Promise.all([
        getUserByEmail(params.creator, params.tenant).then(handleRes),
        getUserByEmail(params.fields.technician, params.tenant).then(handleRes),
        getGroupByName(params.fields.group, params.tenant).then(handleRes),
    ]);

    const [workflow, { requester, creator }, attachments] = await Promise.all([
        getWorkflowDetail({
            tenant: params.tenant,
            templateId: params.template,
            workflowId: template.workflow,
        }),
        getRequesterCreator(params.tenant, userId, params.requester),
        getFileAttachments(params.attachments),
    ]);

    params.fields.technician = technician;
    params.fields.group = group;

    const ticket = new Ticket({
        id: v1(),
        name: params.name,
        description: params.description,
        template,
        workflow,
        attachments: params.attachments,
        tenant: params.tenant,
        created_time: new Date(),
        creator,
        requester: requester ? requester : creator,
        activities: [],
    });
    const edge = ticket.workflow.edges[0];
    const isEndUser = false;
    const [possibleStatus] = await Promise.all([
        getPossibleStatus(ticket.workflow, ticket.status?.id),
        buildTicketDocument(ticket, params.fields, isEndUser, creator, true),
    ]);
    const ticketNumberRes = await getNextTicketNumber({
        key: `${params.tenant}:request:ticket`,
    });
    if (!ticketNumberRes.body?.number) {
        throw new HttpError(error.service(ticketNumberRes.path));
    }

    ticket.number = `REQ${ticketNumberRes.body.number}`;
    actionSendMail(
        ticket.toObject(),
        edge.source,
        edge.target,
        "request",
        creator.email,
        configs.email.link as string
    );
    await ticket.save();
    const transformOutput = transformTemplate({
        template: ticket.template,
        resourceId: ticket.id,
        isEndUser,
    });

    const next_status = possibleStatus.filter(
        (s) => s.id !== ticket.status?.id
    );
    const result = {
        ...ticket.toJSON(),
        ...transformOutput,
        _id: undefined,
        attachments,
        next_status,
    };
    return success.created(result);
}

export async function createTicketInEU(
    params: CreateTicketReqBodyIn
): Promise<Result> {
    params.tenant = await getUserByEmail(params.creator).then((res) => {
        if (res.body?.tenant) {
            return res.body.tenant;
        } else {
            throw new HttpError(error.service(res.url));
        }
    });
    // default value
    params.template = "710b962e-041c-11e1-9234-0123456789ab"; // Default template

    const template = await getTemplateDetail({
        tenant: params.tenant,
        templateId: params.template,
    });

    const userId = await getUserByEmail(params.creator, params.tenant).then(
        (res) => {
            if (res.body?.id) {
                return res.body?.id;
            } else {
                throw new HttpError(error.service(res.url));
            }
        }
    );

    const [workflow, { requester, creator }, attachments] = await Promise.all([
        getWorkflowDetail({
            tenant: params.tenant,
            templateId: params.template,
            workflowId: template.workflow,
        }),
        getRequesterCreator(params.tenant, userId, params.requester),
        getFileAttachments(params.attachments),
    ]);

    const ticket = new Ticket({
        id: v1(),
        name: params.name,
        description: params.description,
        template,
        workflow,
        attachments: params.attachments,
        tenant: params.tenant,
        created_time: params.date ? new Date(params.date) : new Date(),
        creator,
        requester: requester ? requester : creator,
        activities: [],
    });
    const edge = ticket.workflow.edges[0];
    const isEndUser = true;
    const [possibleStatus] = await Promise.all([
        getPossibleStatus(ticket.workflow, ticket.status?.id),
        buildTicketDocument(ticket, params.fields, isEndUser, creator, true),
    ]);
    const ticketNumberRes = await getNextTicketNumber({
        key: `${params.tenant}:request:ticket`,
    });
    if (!ticketNumberRes.body?.number) {
        throw new HttpError(error.service(ticketNumberRes.path));
    }

    ticket.number = `REQ${ticketNumberRes.body.number}`;
    actionSendMail(
        ticket.toObject(),
        edge.source,
        edge.target,
        "request",
        creator.email,
        configs.email.link as string
    );
    await ticket.save();
    const transformOutput = transformTemplate({
        template: ticket.template,
        resourceId: ticket.id,
        isEndUser,
    });

    const next_status = possibleStatus.filter(
        (s) => s.id !== ticket.status?.id
    );
    const result = {
        ...ticket.toJSON(),
        ...transformOutput,
        _id: undefined,
        attachments,
        next_status,
    };
    return success.created(result);
}

async function getTemplateDetail(params: {
    templateId: string;
    tenant?: string;
}): Promise<Omit<ITemplateDetail, "workflow"> & { workflow: string }> {
    const pipeline = templateDetailPipeline(params);
    const templates = await Template.aggregate(pipeline);
    if (templates.length === 0) {
        throw new HttpError(
            error.invalidData({
                param: "template",
                value: params.templateId,
                location: "body",
                message: `the template ${params.templateId} does not exist`,
            })
        );
    }
    return templates[0];
}

async function getWorkflowDetail(params: {
    templateId: string;
    workflowId?: string;
    tenant?: string;
}): Promise<IWorkflowDetail> {
    const errorResult = error.invalidData({
        description: {
            en: "The template's workflow does not exist or is inactive.",
            vi: "Workflow của template không tồn tại hoặc bị inactive.",
        },
        param: "template",
        value: params.templateId,
        location: "body",
    });
    if (!params.workflowId) {
        throw new HttpError(errorResult);
    }
    const pipeline = workflowDetailPipeline({
        tenant: params.tenant,
        workflowId: params.workflowId,
    });
    const workflows = await Workflow.aggregate(pipeline);
    if (workflows.length === 0) {
        throw new HttpError(errorResult);
    }
    return workflows[0];
}

export async function importTickets(params: {
    importData: ImportTicketsBody;
    tenant: string;
    userId: string;
    userRoles: string[];
}): Promise<Result> {
    if (params.tenant !== "DVC") {
        return error.actionNotAllowed();
    }

    function handleRes(res: { body?: { id: string }; url: string }): string {
        if (res.body?.id) {
            return res.body?.id;
        } else {
            throw new HttpError(error.service(res.url));
        }
    }

    const diacriticsMap: { [key: string]: string } = {
        à: "a",
        á: "a",
        ả: "a",
        ã: "a",
        ạ: "a",
        ă: "a",
        ằ: "a",
        ắ: "a",
        ẳ: "a",
        ẵ: "a",
        ặ: "a",
        â: "a",
        ầ: "a",
        ấ: "a",
        ẩ: "a",
        ẫ: "a",
        ậ: "a",
        è: "e",
        é: "e",
        ẻ: "e",
        ẽ: "e",
        ẹ: "e",
        ê: "e",
        ề: "e",
        ế: "e",
        ể: "e",
        ễ: "e",
        ệ: "e",
        ì: "i",
        í: "i",
        ỉ: "i",
        ĩ: "i",
        ị: "i",
        ò: "o",
        ó: "o",
        ỏ: "o",
        õ: "o",
        ọ: "o",
        ô: "o",
        ồ: "o",
        ố: "o",
        ổ: "o",
        ỗ: "o",
        ộ: "o",
        ơ: "o",
        ờ: "o",
        ớ: "o",
        ở: "o",
        ỡ: "o",
        ợ: "o",
        ù: "u",
        ú: "u",
        ủ: "u",
        ũ: "u",
        ụ: "u",
        ư: "u",
        ừ: "u",
        ứ: "u",
        ử: "u",
        ữ: "u",
        ự: "u",
        ỳ: "y",
        ý: "y",
        ỷ: "y",
        ỹ: "y",
        ỵ: "y",
        đ: "d",
    };

    function removeVietnameseDiacritics(str: string): string {
        return str.replace(/[^A-Za-z0-9]/g, (match) => {
            return diacriticsMap[match] || match;
        });
    }

    const validFieldsTicketImport = configs.validFieldsTicketImport;
    const ticketsToImport: CreateTicketReqBody[] = [];
    for (const ticket of params.importData) {
        const requester = ticket.requester
            ? await getUserByEmail(ticket.requester, "DVC").then(handleRes)
            : ticket.requester;
        const service = validFieldsTicketImport.service.find(
            (s: { name: string }) =>
                s.name.trim().toLowerCase() ===
                removeVietnameseDiacritics(
                    ticket.fields.service.trim().toLowerCase()
                )
        );
        const subService = service?.sub_service.find(
            (ss: { name: string }) =>
                ss.name.trim().toLowerCase() ===
                removeVietnameseDiacritics(
                    ticket.fields.sub_service.trim().toLowerCase()
                )
        );
        const subServicesL2 = subService?.sub_services_L2.find(
            (ssl2: { name: string }) =>
                ssl2.name.trim().toLowerCase() ===
                removeVietnameseDiacritics(
                    ticket.fields.sub_services_L2.trim().toLowerCase()
                )
        );
        const status = validFieldsTicketImport.status.find(
            (s: { name: string }) =>
                s.name.trim().toLowerCase() ===
                removeVietnameseDiacritics(
                    ticket.fields.status.trim().toLowerCase()
                )
        )?.id;
        const type =
            ticket.fields.type.trim() === ""
                ? ""
                : validFieldsTicketImport.type.find(
                      (t: { name: string }) =>
                          t.name.trim().toLowerCase() ===
                          removeVietnameseDiacritics(
                              ticket.fields.type.trim().toLowerCase()
                          )
                  )?.id;
        const channel =
            ticket.fields.channel.trim() === ""
                ? ""
                : validFieldsTicketImport.channel.find(
                      (c: { name: string }) =>
                          c.name.trim().toLowerCase() ===
                          removeVietnameseDiacritics(
                              ticket.fields.channel.trim().toLowerCase()
                          )
                  )?.id;
        const group = validFieldsTicketImport.group.find(
            (g: { name: string }) =>
                g.name.trim().toLowerCase() ===
                removeVietnameseDiacritics(
                    ticket.fields.group.trim().toLowerCase()
                )
        );
        const technician = group?.members.find(
            (t: { name: string }) =>
                t.name.trim().toLowerCase() ===
                removeVietnameseDiacritics(
                    ticket.fields.technician.trim().toLowerCase()
                )
        );
        const priority =
            ticket.fields.priority.trim() === ""
                ? ""
                : validFieldsTicketImport.priority.find(
                      (p: { name: string }) =>
                          p.name.trim().toLowerCase() ===
                          removeVietnameseDiacritics(
                              ticket.fields.priority.trim().toLowerCase()
                          )
                  )?.id;

        const ticketToImport: CreateTicketReqBody = {
            name: ticket.name,
            requester: requester,
            description: ticket.description,
            fields: {
                status: status,
                type: type,
                channel: channel,
                group: group?.id,
                technician:
                    ticket.fields.technician.trim() === ""
                        ? ""
                        : technician?.id,
                priority: priority,
                service: ticket.fields.service.trim() === "" ? "" : service?.id,
                sub_service:
                    ticket.fields.sub_service.trim() === ""
                        ? ""
                        : subService?.id,
                sub_services_L2:
                    ticket.fields.sub_services_L2.trim() === ""
                        ? ""
                        : subServicesL2?.id,
                overdue_time: String(Number(ticket.fields.overdue_time) / 1000),
            },
            template: "837ab94e-efe3-11ed-a05b-0242ac120003", // Default template DVC
            attachments: [],
        };

        ticketsToImport.push(ticketToImport);
    }

    type ErrorTicket = ImportTicketBody & Result;
    const results = {
        errorTickets: [] as ErrorTicket[],
        validTickets: [] as Result[],
    };
    for (let i = 0; i < ticketsToImport.length; i++) {
        try {
            const result = await createTicket({
                ...ticketsToImport[i],
                tenant: params.tenant as string,
                userRoles: params.userRoles,
                userId: params.userId,
            });
            results.validTickets.push(result);
        } catch (error) {
            results.errorTickets.push({
                ...params.importData[i],
                ...(error as Result),
            } as ErrorTicket);
        }
    }
    return success.ok(results);
}

export async function getTemplateUrl(): Promise<Result> {
    const object = "ServiceDeskMBFDT_TemplateImportTicket_DVC.xlsx";
    const response = await getDownloadLinks([object]);
    if (response.status === HttpStatus.OK && response.body) {
        return success.ok({ link: response.body[0].link });
    } else {
        return error.notFound({ message: "template object is not configured" });
    }
}
