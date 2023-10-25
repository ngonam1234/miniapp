import { actionSendMail } from "action-mail";
import { HttpError, HttpStatus, Result, error, success } from "app";
import logger from "logger";
import { v1 } from "uuid";
import { configs } from "../../configs";
import {
    IPeople,
    ITemplateDetail,
    IWorkflowDetail,
} from "../../interfaces/models";
import {
    CreateTicketReqBody,
    CreateTicketReqBodyIn,
} from "../../interfaces/request";
import { RoleType } from "../../interfaces/response";
import { Template, Ticket, Workflow } from "../../models";
import {
    findMatchingSlaForTicket,
    findRoleByIds,
    getGroupById,
    getGroupByName,
    getNextTicketNumber,
    getUserByEmail,
    updateTimeAssignee,
} from "../../service";
import { findMatchingAutoForTicket } from "../../service/auto.service";
import { getPossibleStatus, transformTemplate } from "../common.controller";
import { templateDetailPipeline } from "../template.controller";
import { workflowDetailPipeline } from "../workflow.controller";
import { buildTicketDocument } from "./build.ticket";
import { getRequesterCreator, getFileAttachments } from "./common.ticket";


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
            isEndUser =
                roles.some(
                    (role) =>
                        role.type === RoleType.CUSTOMER ||
                        (role.type === RoleType.DEFAULT && role.id === "EU")
                ) &&
                !roles.some(
                    (role) =>
                        role.type === RoleType.EMPLOYEE ||
                        (role.type === RoleType.DEFAULT && role.id !== "EU")
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
    const identityKey = `${params.tenant}:incident:ticket`;
    const [ticketNumberRes, matchedSlaRes] = await Promise.all([
        getNextTicketNumber({ key: identityKey }),
        findMatchingSlaForTicket(ticket.toObject()),
    ]);

    if (!ticketNumberRes.body?.number) {
        return error.service(ticketNumberRes.path);
    }
    // matchedSlaRes.body && (ticket.sla = matchedSlaRes.body);
    ticket.number = `INC${ticketNumberRes.body.number}`;
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
    // if (params.tenant != "TestPerf") {
    actionSendMail(
        ticket.toObject(),
        edge.source,
        edge.target,
        "incident",
        creator.email,
        configs.email.link as string
    );
    // }

    const check = await findMatchingAutoForTicket(ticket, "CREATE", "INCIDENT");
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

export async function createTicketIn(
    params: CreateTicketReqBodyIn
): Promise<Result> {
    // default value
    params.template = "710b962e-041c-11e1-9234-0123456789ab"; // Default template
    params.fields.status = "2102d392-ad11-11ed-afa1-0242ac120002"; // Open
    params.fields.channel = "0c202d55-df82-4322-bf90-8de684e1a6c7"; // Monitor
    params.fields.type = "9ac4514c-ad20-11ed-afa1-0242ac120002"; // Xu ly su co
    params.fields.priority = "9ad60e08-ae94-11ed-afa1-0242ac120002"; // Medium
    params.fields.service = "b296f6a0-cc63-11ed-a775-ed9a75b07b12"; // Operation System
    params.fields.sub_service = "cc18f650-cc63-11ed-a775-ed9a75b07b12"; // Windows

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
        key: `${params.tenant}:incident:ticket`,
    });
    if (!ticketNumberRes.body?.number) {
        throw new HttpError(error.service(ticketNumberRes.path));
    }

    ticket.number = `INC${ticketNumberRes.body.number}`;
    actionSendMail(
        ticket.toObject(),
        edge.source,
        edge.target,
        "incident",
        creator.email,
        configs.email.link as string
    );
    const check = await findMatchingAutoForTicket(ticket, "CREATE", "INCIDENT");
    if (check.body?.id && !ticket.technician.id) {
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
        key: `${params.tenant}:incident:ticket`,
    });
    if (!ticketNumberRes.body?.number) {
        throw new HttpError(error.service(ticketNumberRes.path));
    }

    ticket.number = `INC${ticketNumberRes.body.number}`;
    actionSendMail(
        ticket.toObject(),
        edge.source,
        edge.target,
        "incident",
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
