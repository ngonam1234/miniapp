import { HttpStatus, Result, error, success } from "app";
import { FilterQuery, PipelineStage } from "mongoose";
import { v1 } from "uuid";
import {
    ECommentAction,
    ETicketAction,
    ITicket,
} from "../../interfaces/models";
import {
    CommentTicketReqBody,
    EditCommentTicketReqBody,
} from "../../interfaces/request";
import { Ticket } from "../../models";
import { calculateSlaForTicket, getGroupIdsByUserId } from "../../service";
import { getFileAttachments, getRequesterCreator } from "./common.ticket";

export async function commentTicket(
    params: CommentTicketReqBody & {
        tenant: string;
        userId: string;
        userRoles: string[];
    }
): Promise<Result> {
    const errorTicket = {
        status: HttpStatus.NOT_FOUND,
        code: "NOT_FOUND",
        errors: [
            {
                location: "body",
                param: params.id,
            },
        ],
    };
    const ticket = await Ticket.findOne({ id: params.id });
    if (!ticket) {
        return errorTicket;
    }
    const getGroupIds = await getGroupIdsByUserId({
        userId: params.userId,
    });
    let idgroup;
    if (ticket.group) {
        idgroup = ticket.group.id;
    }

    if (
        params.userRoles.includes("SA") ||
        (params.userRoles.includes("EU") &&
            ticket.creator.id !== params.userId &&
            ticket.requester.id !== params.userId) ||
        (params.userRoles.includes("L*") &&
            getGroupIds.includes(idgroup as string) == false)
    ) {
        return error.actionNotAllowed();
    }

    const [{ creator }, calculatedSlaRes] = await Promise.all([
        getRequesterCreator(params.tenant, params.userId),
        calculateSlaForTicket(ticket.toObject()),
        getFileAttachments(params.attachments),
    ]);
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
    }
    const comment = {
        id: v1(),
        attachments: params.attachments,
        content: params.content,
        created_time: new Date(),
        is_view_eu: params.userRoles.includes("EU") ? true : params.is_view_eu,
        creator: creator,
        activities: [
            {
                action: ECommentAction.CREATE,
                time: new Date(),
                new: params.content,
            },
        ],
    };
    // ticket.a.push(comment)
    ticket.activities.push({
        action: ETicketAction.COMMENT,
        actor: creator,
        note: "Create comment ticket",
        time: new Date(),
        comment: comment,
    });
    await ticket.save();
    return success.ok({ message: "comment success" });
}

export async function replyTicket(
    params: CommentTicketReqBody & {
        tenant: string;
        userId: string;
        userRoles: string[];
    }
): Promise<Result> {
    const errorTicket = {
        status: HttpStatus.NOT_FOUND,
        code: "NOT_FOUND",
        errors: [
            {
                location: "body",
                param: params.id,
            },
        ],
    };
    const ticket = await Ticket.findOne({ id: params.id });
    if (!ticket) {
        return errorTicket;
    }
    if (
        params.userRoles.includes("SA") ||
        (!params.userRoles.includes("TA") &&
            ticket.creator.id !== params.userId &&
            ticket.requester.id !== params.userId)
    ) {
        return error.actionNotAllowed();
    }

    const [{ creator }] = await Promise.all([
        getRequesterCreator(params.tenant, params.userId),
        getFileAttachments(params.attachments),
    ]);
    const reply_comment = ticket.activities.find(
        (e) => e.comment?.id === params.reply_comment
    );

    if (!reply_comment) {
        return errorTicket;
    }
    const comment = {
        id: v1(),
        attachments: params.attachments,
        content: params.content,
        created_time: new Date(),
        type: params.is_view_eu,
        creator: creator,
        is_reply: true,
        reply_comment: {
            reply_id: reply_comment.comment?.id,
            reply_content: reply_comment.comment?.content,
        },
        activities: [
            {
                action: ECommentAction.REPLY,
                time: new Date(),
                new: params.content,
            },
        ],
    };
    ticket.activities.push({
        action: ETicketAction.COMMENT,
        actor: creator,
        note: "Create comment ticket",
        time: new Date(),
        comment: comment,
    });
    await ticket.save();
    return success.ok({ message: "reply success" });
}

export async function editComment(
    params: EditCommentTicketReqBody & {
        tenant: string;
        userId: string;
        userRoles: string[];
    }
): Promise<Result> {
    const errorComment = {
        status: HttpStatus.UNAUTHORIZED,
        code: "NOT_FOUND_ACTION",
        errors: [
            {
                location: "body",
                param: params.id,
            },
        ],
    };
    const errorTicket = {
        status: HttpStatus.NOT_FOUND,
        code: "NOT_FOUND",
        errors: [
            {
                location: "body",
                param: params.id,
            },
        ],
    };
    const ticket = await Ticket.findOne({ id: params.id });
    await Promise.all([getFileAttachments(params.attachments)]);
    if (!ticket) {
        return errorTicket;
    }
    const getGroupIds = await getGroupIdsByUserId({
        userId: params.userId,
    });
    let idgroup;
    if (ticket.group) {
        idgroup = ticket.group.id;
    }

    if (
        params.userRoles.includes("SA") ||
        (params.userRoles.includes("EU") &&
            ticket.creator.id !== params.userId &&
            ticket.requester.id !== params.userId) ||
        (params.userRoles.includes("L*") &&
            getGroupIds.includes(idgroup as string) == false)
    ) {
        return error.actionNotAllowed();
    }
    const oldComment = ticket.activities.find(
        (e) => e.comment?.id === params.id_comment
    );

    if (oldComment) {
        if (oldComment.comment?.creator?.id !== params.userId) {
            return errorComment;
        }
        const activity = {
            action: ECommentAction.UPDATE,
            time: new Date(),
            old: oldComment.comment.content,
            new: params.content,
        };
        const filter: FilterQuery<ITicket> = {
            id: params.id,
            activities: {
                $elemMatch: {
                    "comment.id": params.id_comment,
                },
            },
        };
        const update = {
            $set: {
                "activities.$.comment.content": params.content,
            },
            $push: {
                "activities.$.comment.activities": activity,
            },
        };
        const result = await Ticket.updateOne(filter, update, { new: true });
        if (result.matchedCount === 1) {
            return success.ok({ message: "success" });
        } else {
            return error.notFound({
                location: "params",
                param: "id_comment",
                value: params.id_comment,
                message: `the comment ${params.id_comment} does not exist`,
            });
        }
    } else {
        return errorTicket;
    }
}

export async function showComment(params: {
    id: string;
    tenant: string;
    userId: string;
    size: number;
    page: number;
    userRoles: string[];
}): Promise<Result> {
    const errorTicket = {
        status: HttpStatus.NOT_FOUND,
        code: "NOT_FOUND",
        errors: [
            {
                location: "body",
                param: params.id,
            },
        ],
    };
    const pipeline: PipelineStage[] = [];
    let match: undefined | FilterQuery<ITicket> = undefined;
    match = {
        $and: [{ id: params.id }],
    };
    pipeline.push({ $match: match });
    params.size == undefined || params.size == null
        ? (params.size = 10)
        : params.size,
        params.page == undefined || params.page == null
            ? (params.page = 0)
            : params.page;

    const facet = {
        meta: [{ $count: "total" }],
        data: [
            { $skip: params.size * params.page },
            { $limit: params.size * 1 },
        ],
    };
    pipeline.push(
        { $project: { _id: 0, comment: "$activities.comment" } },
        { $unwind: "$comment" },
        { $sort: { "comment.created_time": -1 } },
        { $replaceRoot: { newRoot: "$comment" } },
        { $facet: facet }
    );
    const ticket = await Ticket.findOne({ id: params.id })?.lean();
    if (!ticket) {
        return errorTicket;
    }

    const getGroupIds = await getGroupIdsByUserId({
        userId: params.userId,
    });

    let idgroup: string;
    if (ticket.group) {
        idgroup = ticket.group.id;
    }
    const result = await Ticket.aggregate(pipeline)
        .collation({ locale: "vi" })
        .then((res) => res[0])
        .then((res) => {
            let total = 0;
            let info;
            type dataType = { is_view_eu: boolean };
            if (params.userRoles.includes("EU")) {
                info = res.data.filter((e: dataType) => e.is_view_eu == true);
                total = !(info.length > 0) ? 0 : info.length;
            } else if (
                params.userRoles.includes("L1") ||
                (params.userRoles.includes("L2") &&
                    getGroupIds.includes(idgroup as string) == true) ||
                params.userRoles.includes("TA")
            ) {
                info = res.data;
                total = !(res.meta.length > 0) ? 0 : res.meta[0].total;
            } else {
                return error.actionNotAllowed();
            }
            return {
                page: Number(params.page),
                total: total,
                total_page: Math.ceil(total / params.size),
                data: info,
            };
        });
    return success.ok(result);
}
