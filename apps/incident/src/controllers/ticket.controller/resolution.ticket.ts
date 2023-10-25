import { error, HttpStatus, Result, success } from "app";
import { equal, isNullOrUndefined } from "utils";
import {
    ETicketAction,
    IPeople,
    ITicket,
    ITicketResolution,
} from "../../interfaces/models";
import { UpdateResolutionReqBody } from "../../interfaces/request";
import { document, Ticket } from "../../models";
import { getUserById } from "../../service";
import { getFileAttachments } from "./common.ticket";

export async function getTicketResolution(params: {
    ticketId: string;
    tenant: string;
}): Promise<Result> {
    const resolutions: ITicketResolution[] = await Ticket.aggregate([
        {
            $match: {
                id: params.ticketId,
                tenant: params.tenant,
            },
        },
        {
            $set: {
                resolution: {
                    $ifNull: ["$resolution", {}],
                },
            },
        },
        { $replaceRoot: { newRoot: "$resolution" } },
    ]);
    const resolution = resolutions[0];
    const objects: string[] = [];
    if (resolution.cause?.attachments) {
        objects.push(...resolution.cause.attachments);
    }
    if (resolution.solution?.attachments) {
        objects.push(...resolution.solution.attachments);
    }
    const attachments = await getFileAttachments(objects);
    type TmpType = typeof getFileAttachments;
    type TypeAttachment = Awaited<ReturnType<TmpType>>[0];
    const causeAttachments: TypeAttachment[] = [];
    const solutionAttachments: TypeAttachment[] = [];
    resolution.cause?.attachments.forEach((i) => {
        const at = attachments.find((a) => a.object === i);
        at && causeAttachments.push(at);
    });
    resolution.solution?.attachments.forEach((i) => {
        const at = attachments.find((a) => a.object === i);
        at && solutionAttachments.push(at);
    });
    const result = {
        ...resolution,
    };
    if (result.cause?.attachments) {
        Object.assign(result.cause.attachments, causeAttachments);
    }
    if (result.solution?.attachments) {
        Object.assign(result.solution.attachments, solutionAttachments);
    }

    return success.ok(result);
}

export async function updateTicketResolution(
    params: UpdateResolutionReqBody & {
        ticketId: string;
        userId: string;
        userRoles: string[];
        tenant: string;
    }
): Promise<Result> {
    const invalidResolutionError = error.invalidData({
        location: "body",
        param: "cause|solution",
        value: { cause: params.cause, solution: params.solution },
        description: {
            vi: "Nguyên nhân hoặc giải pháp cho sự cố không được bỏ trống.",
            en: "The cause and solution of the problem can not be empty.",
        },
    });

    const invalidSolutionError = error.invalidData({
        location: "body",
        param: "solution",
        value: params.solution,
        description: {
            vi: "Giải pháp xử lý cho ticket không được bỏ trống.",
            en: "The handling solution for the ticket can not be empty.",
        },
    });

    const invalidCauseError = error.invalidData({
        location: "body",
        param: "cause",
        value: params.cause,
        description: {
            vi: "Nguyên nhân của ticket không được bỏ trống.",
            en: "The cause of the ticket can not be empty.",
        },
    });

    if (
        isNullOrUndefined(params.cause?.content) &&
        isNullOrUndefined(params.solution?.content) &&
        isNullOrUndefined(params.solution?.attachments) &&
        isNullOrUndefined(params.cause?.attachments)
    ) {
        return invalidResolutionError;
    }

    const attachments: string[] = [];
    if (params.cause?.attachments) {
        attachments.push(...params.cause.attachments);
    }
    if (params.solution?.attachments) {
        attachments.push(...params.solution.attachments);
    }

    const [getUserRes, allAttachment] = await Promise.all([
        getUserById(params.userId),
        getFileAttachments(attachments),
    ]);

    if (!getUserRes.body || getUserRes.status !== HttpStatus.OK) {
        throw new Error("the user id is not valid");
    }

    const ticket = await Ticket.findOne({
        id: params.ticketId,
        tenant: params.tenant,
    });
    if (!ticket) {
        return error.notFound({
            location: "params",
            param: "ticketId",
            value: params.ticketId,
            message: "the ticket does not exist",
        });
    }
    const ticketSolution = ticket.resolution?.solution;
    const ticketCause = ticket.resolution?.cause;
    if (
        // CLOSED
        ticket.status?.id === "89e27354-ad11-11ed-afa1-0242ac120002" ||
        // CANCELED
        ticket.status?.id === "89e2748a-ad11-11ed-afa1-0242ac120002"
    ) {
        return error.invalidData({
            location: "params",
            param: "ticketId",
            value: params.ticketId,
            message: "the ticket can not update resolution.",
        });
    }

    ticket.activities.push({
        actor: getUserRes.body,
        time: new Date(),
        action: ETicketAction.UPDATE,
    });
    let updatedTicket = false;
    if (params.cause && !ticketCause) {
        if (!params.cause.attachments?.length && params.cause.content === "") {
            return invalidCauseError;
        }
        createResolutionCause(
            ticket,
            params.cause,
            getUserRes.body,
            allAttachment
        );
        updatedTicket = true;
    } else if (params.cause && ticketCause) {
        updatedTicket = updateResolutionCause(
            ticket,
            params.cause,
            getUserRes.body,
            allAttachment
        );
    }

    if (params.solution && !ticketSolution) {
        if (
            !params.solution.attachments?.length &&
            params.solution.content === ""
        ) {
            return invalidSolutionError;
        }
        updatedTicket = true;
        createResolutionSolution(
            ticket,
            params.solution,
            getUserRes.body,
            allAttachment
        );
    } else if (params.solution && ticketSolution) {
        updatedTicket ||= updateResolutionSolution(
            ticket,
            params.solution,
            getUserRes.body,
            allAttachment
        );
    }

    if (updatedTicket === true) {
        await ticket.save();
    }
    return success.ok(ticket.resolution);
}

function createResolutionCause(
    ticket: document<ITicket>,
    cause: Exclude<UpdateResolutionReqBody["cause"], undefined>,
    creator: IPeople,
    allAttachment: { object: string; name: string }[]
): void {
    ticket.resolution = {
        cause: {
            content: cause.content ?? "",
            attachments: cause.attachments ?? [],
            updated_time: new Date(),
            updated_by: creator,
        },
    };

    const activity = ticket.activities.at(-1);
    if (!activity) return;
    activity.updates = [
        {
            field: { name: "cause", display: "Nguyên nhân" },
            new: {
                content: cause.content,
                attachments: cause.attachments
                    ?.map((o) => allAttachment.find((a) => a.object === o))
                    .map((i) => String(i?.name)),
            },
        },
    ];
}

function updateResolutionCause(
    ticket: document<ITicket>,
    cause: Exclude<UpdateResolutionReqBody["cause"], undefined>,
    creator: IPeople,
    allAttachment: { object: string; name: string }[]
): boolean {
    ticket.resolution = ticket.resolution || {};
    const ticketCause = ticket.resolution.cause;
    const ticketCauseCp = { ...ticketCause };
    let updatedTicket = false;
    if (
        ticketCause != null &&
        !isNullOrUndefined(cause.content) &&
        ticketCause.content !== cause.content
    ) {
        ticketCause.content = cause.content ?? ticketCause.content;
        ticketCause.updated_time = new Date();
        ticketCause.updated_by = creator;
        updatedTicket = true;
    }
    if (
        ticketCause != null &&
        !isNullOrUndefined(cause.attachments) &&
        ticketCause.attachments[equal](cause.attachments) === false
    ) {
        ticketCause.attachments = cause.attachments ?? ticketCause.attachments;
        ticketCause.updated_time = new Date();
        ticketCause.updated_by = creator;
        updatedTicket = true;
    }
    const activity = ticket.activities.at(-1);
    if (!activity || !updatedTicket) return false;
    activity.updates = [
        {
            field: { name: "cause", display: "Nguyên nhân" },
            old: {
                content: ticketCauseCp.content,
                attachments: ticketCauseCp.attachments
                    ?.map((o) => allAttachment.find((a) => a.object === o))
                    .map((i) => String(i?.name)),
            },
            new: {
                content: cause.content,
                attachments: cause.attachments
                    ?.map((o) => allAttachment.find((a) => a.object === o))
                    .map((i) => String(i?.name)),
            },
        },
    ];
    return updatedTicket;
}

function createResolutionSolution(
    ticket: document<ITicket>,
    solution: Exclude<UpdateResolutionReqBody["solution"], undefined>,
    creator: IPeople,
    allAttachment: { object: string; name: string }[]
): void {
    ticket.resolution = ticket.resolution || {};
    ticket.resolution.solution = {
        content: solution.content ?? "",
        attachments: solution.attachments ?? [],
        updated_time: new Date(),
        updated_by: creator,
    };

    const activity = ticket.activities.at(-1);
    if (!activity) return;
    activity.updates = [
        {
            field: { name: "solution", display: "Giải pháp" },
            new: {
                content: solution.content,
                attachments: solution.attachments
                    ?.map((o) => allAttachment.find((a) => a.object === o))
                    .map((i) => String(i?.name)),
            },
        },
    ];
}

function updateResolutionSolution(
    ticket: document<ITicket>,
    solution: Exclude<UpdateResolutionReqBody["solution"], undefined>,
    creator: IPeople,
    allAttachment: { object: string; name: string }[]
): boolean {
    let updatedTicket = false;
    ticket.resolution = ticket.resolution || {};
    const ticketSolution = ticket.resolution.solution;
    const ticketSolutionCp = { ...ticketSolution };
    if (
        ticketSolution != undefined &&
        !isNullOrUndefined(solution.content) &&
        ticketSolution.content !== solution.content
    ) {
        ticketSolution.content = solution.content ?? ticketSolution.content;
        ticketSolution.updated_time = new Date();
        ticketSolution.updated_by = creator;
        updatedTicket = true;
    }
    if (
        ticketSolution != undefined &&
        !isNullOrUndefined(solution.attachments) &&
        ticketSolution.attachments[equal](solution.attachments) === false
    ) {
        ticketSolution.attachments =
            solution.attachments ?? ticketSolution.attachments;
        ticketSolution.updated_time = new Date();
        ticketSolution.updated_by = creator;
        updatedTicket = true;
    }
    const activity = ticket.activities.at(-1);
    if (!activity || !updatedTicket) return false;
    activity.updates = [
        {
            field: { name: "solution", display: "Giải pháp" },
            old: {
                content: ticketSolutionCp.content,
                attachments: ticketSolutionCp.attachments
                    ?.map((o) => allAttachment.find((a) => a.object === o))
                    .map((i) => String(i?.name)),
            },
            new: {
                content: solution.content,
                attachments: solution.attachments
                    ?.map((o) => allAttachment.find((a) => a.object === o))
                    .map((i) => String(i?.name)),
            },
        },
    ];
    return updatedTicket;
}
