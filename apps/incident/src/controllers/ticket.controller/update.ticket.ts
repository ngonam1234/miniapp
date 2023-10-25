import { actionSendMail } from "action-mail";
import { error, HttpError, HttpStatus, Result, success } from "app";
import { FilterQuery } from "mongoose";
import { verifyTicketTransistion } from "rule-engines";
import { v1 } from "uuid";
import { configs } from "../../configs";
import { ETicketAction, IPeople, ITicket, ITicketActivityItem } from "../../interfaces/models";
import {
    UpdateTicketInReqBody,
    UpdateTicketReqBody,
} from "../../interfaces/request";
import { RoleType } from "../../interfaces/response";
import { Ticket } from "../../models";
import {
    calculateSlaForTicket,
    findMatchingSlaForTicket,
    findRoleByIds,
    getGroupById,
    getUserById,
    updateTimeAssignee,
} from "../../service";
import { findMatchingAutoForTicket } from "../../service/auto.service";
import { getPossibleStatus, transformTemplate } from "../common.controller";
import { buildTicketDocument } from "./build.ticket";
import { getFileAttachments, getRequesterCreator } from "./common.ticket";

export async function updateTicket(
    params: UpdateTicketReqBody & {
        ticketId: string;
        tenant: string;
        userId: string;
        userRoles: string[];
    }
): Promise<Result> {
    const session = await Ticket.startSession();
    const filter: FilterQuery<ITicket> = {
        id: params.ticketId,
        tenant: params.tenant,
    };

    const oldTicket = await Ticket.findOne(filter);

    let isEndUser = false;
    let isEdit = false;
    let isEditPriority = false;
    // let isEditImpact = false;
    // let isEditUrgency = false;
    let isEditDueDate = false;
    let isEditRequester = false;
    let isEditChangeStatusToResolved = false;
    let isEditChangeStatusToClosed = false;
    let isEditChangeStatusToCancelled = false;

    const response = await findRoleByIds(params.userRoles, params.tenant);
    if (response.status === HttpStatus.OK) {
        const roles = response.body;
        if (roles && roles.length > 0) {
            isEdit = roles.some((role) => role.incident_permission.edit);
            isEndUser = roles.some(
                (role) =>
                    role.type === RoleType.CUSTOMER ||
                    (role.type === RoleType.DEFAULT && role.id === "EU")
            );
            isEditPriority = roles.some(
                (role) => role.incident_permission.edit_priority
            );
            // isEditImpact = roles.some(
            //     (role) => role.incident_permission.edit_impact
            // );
            // isEditUrgency = roles.some(
            //     (role) => role.incident_permission.edit_urgency
            // );
            isEditDueDate = roles.some(
                (role) => role.incident_permission.edit_due_date
            );
            isEditRequester = roles.some(
                (role) => role.incident_permission.edit_requester
            );
            isEditChangeStatusToResolved = roles.some(
                (role) => role.incident_permission.change_status_to_resolved
            );
            isEditChangeStatusToClosed = roles.some(
                (role) => role.incident_permission.change_status_to_closed
            );
            isEditChangeStatusToCancelled = roles.some(
                (role) => role.incident_permission.change_status_to_cancelled
            );
        }
    }
    if (!isEdit) {
        return error.actionNotAllowed();
    }
    if (
        params?.fields?.priority &&
        params?.fields?.priority !== oldTicket?.priority?.id &&
        !isEditPriority
    ) {
        return error.actionNotAllowed();
    }
    // if (params?.fields?.impact && !isEditImpact) {
    //     return error.actionNotAllowed();
    // }
    // if (params?.fields?.urgency && !isEditUrgency) {
    //     return error.actionNotAllowed();
    // }
    if (
        params?.fields?.overdue_time &&
        params?.fields?.overdue_time.length > 0 &&
        !isEditDueDate
    ) {
        return error.actionNotAllowed();
    }
    if (
        params.requester &&
        params.requester !== oldTicket?.requester?.id &&
        !isEditRequester
    ) {
        return error.actionNotAllowed();
    }
    if (oldTicket?.status?.id !== params?.fields?.status) {
        if (
            (params?.fields?.status ===
                "a8d928bc-ee15-11ed-a05b-0242ac120003" &&
                !isEditChangeStatusToResolved) ||
            (params?.fields?.status ===
                "a8d91ffc-ee15-11ed-a05b-0242ac120003" &&
                !isEditChangeStatusToClosed) ||
            (params?.fields?.status ===
                "a8d92740-ee15-11ed-a05b-0242ac120003" &&
                !isEditChangeStatusToCancelled)
        ) {
            return error.actionNotAllowed();
        }
    }

    session.startTransaction();
    try {
        const [ticket, { requester, creator }] = await Promise.all([
            Ticket.findOne(filter),
            getRequesterCreator(params.tenant, params.userId, params.requester),
        ]);
        if (!ticket) {
            throw new HttpError(
                error.notFound({
                    location: "body",
                    param: "ticketId",
                    value: params.ticketId,
                    message: "the ticket does not exist",
                })
            );
        }
        const source = ticket.workflow.nodes.find(
            (n) => n.status?.id === ticket.status?.id
        )?.id;
        const target = ticket.workflow.nodes.find(
            (n) => n.status?.id === params?.fields?.status
        )?.id;
        if (params.requester && requester) {
            ticket.requester = requester;
        }
        await buildTicketDocument(
            ticket,
            params.fields || {},
            isEndUser,
            creator,
            false,
            params.note
        );

        const objects = new Set(ticket.attachments);
        params.attachments?.forEach((item) => objects.add(item));
        const attachments = await getFileAttachments(Array.from(objects));

        const oldAttchments: typeof attachments = [];
        let newAttchments: typeof attachments = [];
        if (params.attachments) {
            for (let i = 0; i < attachments.length; i++) {
                const attachment = attachments[i];
                if (ticket.attachments.includes(attachment.object)) {
                    oldAttchments.push(attachment);
                }
                if (params.attachments.includes(attachment.object)) {
                    newAttchments.push(attachment);
                }
            }
        } else {
            newAttchments = oldAttchments;
        }

        const activity = ticket.activities.at(-1);
        const updates = activity?.updates;
        if (updates) {
            if (
                params.attachments != null &&
                !ticket.attachments.equal(params.attachments)
            ) {
                updates.unshift({
                    field: {
                        name: "attachments",
                        display: "Tệp đính kèm",
                    },
                    old: oldAttchments.map((i) => i.name),
                    new: newAttchments.map((i) => i.name),
                });
                ticket.attachments = params.attachments;
            }
            if (
                params.description != null &&
                params.description !== ticket.description
            ) {
                updates.unshift({
                    field: {
                        name: "description",
                        display: "Nội dung yêu cầu",
                    },
                    old: ticket.description,
                    new: params.description,
                });
                ticket.description = params.description;
            }
            if (params.name != null && params.name !== ticket.name) {
                updates.unshift({
                    field: {
                        name: "name",
                        display: "Tên yêu cầu",
                    },
                    old: ticket.name,
                    new: params.name,
                });
                ticket.name = params.name;
            }
        }

        ticket.updated_time = new Date();

        const objTicket = ticket.toObject();
        if (source && target) {
            const result = verifyTicketTransistion(
                objTicket,
                params,
                source,
                target
            );
            if (result.valid === false) {
                let description = undefined;
                if (result.reason) {
                    description = {
                        vi: result.reason,
                        en: result.reason,
                    };
                }
                throw new HttpError(
                    error.invalidData({
                        location: result.location,
                        param: result.path,
                        description,
                    })
                );
            }
            actionSendMail(
                objTicket,
                source,
                target,
                "request",
                creator.email,
                configs.email.link as string
            );
        }

        const rematching = shouldRematchingSla(ticket.activities);
        const [possibleStatus, calculatedSlaRes] = await Promise.all([
            getPossibleStatus(ticket.workflow, ticket.status?.id),
            rematching
                ? findMatchingSlaForTicket(objTicket)
                : calculateSlaForTicket(objTicket),
        ]);

        if (
            ticket.status?.id == "2102d392-ad11-11ed-afa1-0242ac120002" ||
            ticket.status?.id == "89e265d0-ad11-11ed-afa1-0242ac120002"
        ) {
            const technician = await findMatchingAutoForTicket(
                ticket,
                "EDIT",
                "INCIDENT"
            );
            if (technician.body?.id && !params.fields?.technician) {
                const group = await getGroupById({
                    tenant: params.tenant,
                    group: technician.body?.group?.id as string,
                });
                ticket.group = {
                    id: group.body?.id as string,
                    name: group.body?.name as string,
                };
                objTicket.group = {
                    id: group.body?.id as string,
                    name: group.body?.name as string,
                };
                delete technician.body?.group;
                ticket.technician = technician.body as IPeople;
                objTicket.technician = technician.body as IPeople;

                await updateTimeAssignee(
                    technician.body?.id as string,
                    ticket.tenant as string,
                    true
                );
            }
        }
        if (calculatedSlaRes.body) {
            const sla = calculatedSlaRes.body;
            const resOverdueTime = sla.response_assurance?.overdue_time
                ? new Date(sla.response_assurance?.overdue_time)
                : ticket.sla?.response_assurance?.overdue_time;
            const revOverdueTime = sla.resolving_assurance?.overdue_time
                ? new Date(sla.resolving_assurance?.overdue_time)
                : ticket.sla?.resolving_assurance?.overdue_time;
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
            Object.assign(objTicket, {
                sla: {
                    ...sla,
                    response_assurance,
                    resolving_assurance,
                },
            });
        }
        if (!updates?.length && activity?.action === ETicketAction.UPDATE) {
            ticket.activities.pop();
        }
        await ticket.save();
        await session.commitTransaction();
        
        if (objTicket.connect) {
            let request = 0;
            let incident = 0;
            request = objTicket.connect.requests
                ? objTicket.connect.requests.length
                : 0;
            incident = objTicket.connect.incidents
                ? objTicket.connect.incidents.length
                : 0;
            Object.assign(objTicket, {
                connect: {
                    requests: request,
                    incidents: incident,
                },
            });
        }

        const transformOutput = transformTemplate({
            template: ticket.template,
            resourceId: ticket.id,
            isEndUser,
        });

        const next_status = possibleStatus.filter(
            (s) => s.id !== ticket.status?.id
        );
        const nAttachments = !params.attachments
            ? await getFileAttachments(ticket.attachments)
            : attachments;
        const result = {
            ...objTicket,
            ...transformOutput,
            _id: undefined,
            attachments: nAttachments,
            next_status,
        };
        return success.ok(result);
    } catch (err) {
        await session.abortTransaction();
        throw err;
    } finally {
        session.endSession();
    }
}

export async function updateTicketIn(
    params: UpdateTicketInReqBody & {
        ticketId: string;
    }
): Promise<Result> {
    const filter: FilterQuery<ITicket> = {
        id: params.ticketId,
    };

    const creator: IPeople = {
        id: v1(),
        email: "system@aka247.fpt.com",
        fullname: "Hệ thống",
        is_active: true,
        position: "",
        phone: "",
    };

    const [ticket, requester] = await Promise.all([
        Ticket.findOne(filter),
        params.requester &&
            getUserById(params.requester).then((res) => res.body),
    ]);
    if (!ticket) {
        throw new HttpError(
            error.notFound({
                location: "body",
                param: "ticketId",
                value: params.ticketId,
                message: "the ticket does not exist",
            })
        );
    }
    const source = ticket.workflow.nodes.find(
        (n) => n.status?.id === ticket.status?.id
    )?.id;
    const target = ticket.workflow.nodes.find(
        (n) => n.status?.id === params?.fields?.status
    )?.id;
    if (params.requester && requester) {
        ticket.requester = requester;
    }
    if (params.fields) {
        await buildTicketDocument(
            ticket,
            params.fields,
            false,
            creator,
            false,
            params.note
        );
    }

    const objects = new Set(ticket.attachments);
    params.attachments?.forEach((item) => objects.add(item));
    const attachments = await getFileAttachments(Array.from(objects));

    const oldAttchments: typeof attachments = [];
    const newAttchments: typeof attachments = [];
    if (params.attachments) {
        for (let i = 0; i < attachments.length; i++) {
            const attachment = attachments[i];
            if (ticket.attachments.includes(attachment.object)) {
                oldAttchments.push(attachment);
            }
            if (params.attachments.includes(attachment.object)) {
                newAttchments.push(attachment);
            }
        }
    }

    const updates = ticket.activities.at(-1)?.updates;
    if (updates?.length) {
        if (
            params.attachments != null &&
            !ticket.attachments.equal(params.attachments)
        ) {
            updates.unshift({
                field: {
                    name: "attachments",
                    display: "Tệp đính kèm",
                },
                old: oldAttchments.map((i) => i.name),
                new: newAttchments.map((i) => i.name),
            });
            ticket.attachments = params.attachments;
        }
        if (
            params.description != null &&
            params.description !== ticket.description
        ) {
            updates.unshift({
                field: {
                    name: "description",
                    display: "Nội dung yêu cầu",
                },
                old: ticket.description,
                new: params.description,
            });
            ticket.description = params.description;
        }
        if (params.name != null && params.name !== ticket.name) {
            updates.unshift({
                field: {
                    name: "name",
                    display: "Tên yêu cầu",
                },
                old: ticket.name,
                new: params.name,
            });
            ticket.name = params.name;
        }
    }

    ticket.updated_time = new Date();
    const objTicket = ticket.toObject();
    if (source && target) {
        const result = verifyTicketTransistion(
            objTicket,
            params,
            source,
            target
        );
        if (result.valid === false) {
            let description = undefined;
            if (result.reason) {
                description = {
                    vi: result.reason,
                    en: result.reason,
                };
            }
            throw new HttpError(
                error.invalidData({
                    location: result.location,
                    param: result.path,
                    description,
                })
            );
        }
        actionSendMail(
            objTicket,
            source,
            target,
            "request",
            creator.email,
            configs.email.link as string
        );
    }

    if (params.sla) {
        const sla = params.sla;
        const response_assurance = sla.response_assurance && {
            ...sla.response_assurance,
            overdue_time: ticket.sla?.response_assurance?.overdue_time,
        };
        const resolving_assurance = sla.resolving_assurance && {
            ...sla.resolving_assurance,
            overdue_time: ticket.sla?.resolving_assurance?.overdue_time,
        };
        ticket.sla = {
            ...sla,
            response_assurance,
            resolving_assurance,
        };
    }
    await ticket.save();

    const result = {
        ...objTicket,
        _id: undefined,
    };
    return success.ok(result);
}

function shouldRematchingSla(activities: ITicketActivityItem[]): boolean {
    const updates = activities.at(-1)?.updates;
    if (updates == null) return false;
    const fieldsUpdated = updates.map((u) => u.field.name);
    const accepts = [
        "service",
        "sub_service",
        "category",
        "sub_category",
        "priority",
        "group",
        "requester",
        "impact",
        "urgency",
    ];
    return fieldsUpdated.some((i) => accepts.includes(i));
}
