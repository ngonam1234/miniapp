import { Result, success } from "app";
import { calculateOverdueTime } from "../../controllers/time.controller";
import { IHoliday, ISla, IWorkingTime } from "../../interfaces/model";
import { CreateJobReqBody } from "../../interfaces/request";
import {
    getHolidays,
    getTicketIncident,
    getTicketRequest,
    getWorkingTime,
    updateTicketIncident,
    updateTicketRequest,
} from "../../services";
import { sendSlaNotification } from "../../services/mail.service";
import {
    isResolvingAssuranceOverdue,
    isResponseAssuranceOverdue,
} from "./calculate.sla";

export function createCheckJobBody(params: {
    time: Date;
    module: string;
    ticket_id: string;
    where: string;
}): CreateJobReqBody {
    const reqBody = {
        ticket_id: params.ticket_id,
        where: params.where,
    };
    return {
        owner: params.ticket_id,
        type: "ONE_TIME",
        execution_time: params.time,
        execution: {
            type: "HTTP_REQ",
            http_request: {
                url: `http://localhost:6812/api/v1/in/slas/check`,
                method: "POST",
                headers: [{ name: "Content-Type", value: "application/json" }],
                params: [{ name: "module", value: params.module }],
                data: JSON.stringify(reqBody),
            },
        },
    };
}

export async function checkSlaForTicket(params: {
    ticketId: string;
    module: string;
    where: string;
}): Promise<Result> {
    let ticket: { sla: ISla; created_time: string } | undefined = undefined;
    if (params.module === "REQUEST") {
        ticket = await getTicketRequest(params.ticketId).then(
            (res) => res.body as typeof ticket
        );
    } else if (params.module === "INCIDENT") {
        ticket = await getTicketIncident(params.ticketId).then(
            (res) => res.body as typeof ticket
        );
    }
    if (ticket == null) {
        return success.noContent();
    }

    const holidays = getHolidays();
    const { working_time, resolving_assurance, response_assurance }: ISla =
        ticket.sla;
    const workingTime = getWorkingTime(working_time);
    const deta = 2 * 1000;

    const resOverdue = calculateResponseAssuranceOverdue(
        ticket,
        holidays,
        workingTime
    );
    const revOverdue = calculateResolvingAssuranceOverdue(
        ticket,
        holidays,
        workingTime
    );
    switch (params.where) {
        case "RESPONSE_ASSURANCE": {
            if (!resOverdue || !resOverdue.overdueAmount) break;
            if (resOverdue.isOverdue && resOverdue.overdueAmount <= deta) {
                sendSlaNotification({
                    ticket,
                    module: params.module,
                    templateCode: "T007",
                    resOverdueTime: resOverdue.overdueTime,
                });
                if (params.module === "REQUEST") {
                    updateTicketRequest({
                        ticketId: params.ticketId,
                        sla: ticket.sla,
                    });
                } else if (params.module === "INCIDENT") {
                    updateTicketIncident({
                        ticketId: params.ticketId,
                        sla: ticket.sla,
                    });
                }
            }
            break;
        }
        case "RESPONSE_ASSURANCE_ESCALATION_1": {
            const result = calculateResponseAssuranceEscalation1Overdue(
                ticket,
                holidays,
                workingTime
            );
            if (!result || !result.overdueAmount) break;
            if (result.isOverdue && result.overdueAmount <= deta) {
                const first_level = response_assurance?.first_level;
                if (first_level) {
                    if (first_level.notify_to.length) {
                        sendSlaNotification({
                            ticket,
                            module: params.module,
                            templateCode: "T009",
                            resOverdueTime: resOverdue?.overdueTime,
                            receivers: first_level.notify_to,
                        });
                    }
                    if (first_level.update_fields.length) {
                        if (params.module === "REQUEST") {
                            updateTicketRequest({
                                ticketId: params.ticketId,
                                updateFields: first_level.update_fields,
                                sla: ticket.sla,
                            });
                        } else if (params.module === "INCIDENT") {
                            updateTicketIncident({
                                ticketId: params.ticketId,
                                updateFields: first_level.update_fields,
                                sla: ticket.sla,
                            });
                        }
                    }
                }
            }
            break;
        }
        case "RESPONSE_ASSURANCE_ESCALATION_2": {
            const result = calculateResponseAssuranceEscalation2Overdue(
                ticket,
                holidays,
                workingTime
            );
            if (!result || !result.overdueAmount) break;
            if (result.isOverdue && result.overdueAmount <= deta) {
                const second_level = response_assurance?.second_level;
                if (second_level) {
                    if (second_level.notify_to.length) {
                        sendSlaNotification({
                            ticket,
                            module: params.module,
                            templateCode: "T009",
                            resOverdueTime: resOverdue?.overdueTime,
                            receivers: second_level.notify_to,
                        });
                    }
                    if (second_level.update_fields.length) {
                        if (params.module === "REQUEST") {
                            updateTicketRequest({
                                ticketId: params.ticketId,
                                updateFields: second_level.update_fields,
                                sla: ticket.sla,
                            });
                        } else if (params.module === "INCIDENT") {
                            updateTicketIncident({
                                ticketId: params.ticketId,
                                updateFields: second_level.update_fields,
                                sla: ticket.sla,
                            });
                        }
                    }
                }
            }
            break;
        }
        case "RESOLVING_ASSURANCE": {
            if (!revOverdue || !revOverdue.overdueAmount) break;
            if (revOverdue.isOverdue && revOverdue.overdueAmount <= deta) {
                sendSlaNotification({
                    ticket,
                    module: params.module,
                    templateCode: "T008",
                    resOverdueTime: revOverdue.overdueTime,
                });
                if (params.module === "REQUEST") {
                    updateTicketRequest({
                        ticketId: params.ticketId,
                        sla: ticket.sla,
                    });
                } else if (params.module === "INCIDENT") {
                    updateTicketIncident({
                        ticketId: params.ticketId,
                        sla: ticket.sla,
                    });
                }
            }
            break;
        }
        case "RESOLVING_ASSURANCE_ESCALATION_1": {
            const result = calculateResolvingAssuranceEscalation1Overdue(
                ticket,
                holidays,
                workingTime
            );
            if (!result || !result.overdueAmount) break;
            if (result.isOverdue && result.overdueAmount <= deta) {
                const first_level = resolving_assurance?.first_level;
                if (first_level) {
                    if (first_level.notify_to.length) {
                        sendSlaNotification({
                            ticket,
                            module: params.module,
                            templateCode: "T010",
                            resOverdueTime: revOverdue?.overdueTime,
                            receivers: first_level.notify_to,
                        });
                    }
                    if (first_level.update_fields.length) {
                        if (params.module === "REQUEST") {
                            updateTicketRequest({
                                ticketId: params.ticketId,
                                updateFields: first_level.update_fields,
                                sla: ticket.sla,
                            });
                        } else if (params.module === "INCIDENT") {
                            updateTicketIncident({
                                ticketId: params.ticketId,
                                updateFields: first_level.update_fields,
                                sla: ticket.sla,
                            });
                        }
                    }
                }
            }
            break;
        }
        case "RESOLVING_ASSURANCE_ESCALATION_2": {
            const result = calculateResolvingAssuranceEscalation2Overdue(
                ticket,
                holidays,
                workingTime
            );
            if (!result || !result.overdueAmount) break;
            if (result.isOverdue && result.overdueAmount <= deta) {
                const second_level = resolving_assurance?.second_level;
                if (second_level) {
                    if (second_level.notify_to.length) {
                        sendSlaNotification({
                            ticket,
                            module: params.module,
                            templateCode: "T010",
                            resOverdueTime: revOverdue?.overdueTime,
                            receivers: second_level.notify_to,
                        });
                    }
                    if (second_level.update_fields.length) {
                        if (params.module === "REQUEST") {
                            updateTicketRequest({
                                ticketId: params.ticketId,
                                updateFields: second_level.update_fields,
                                sla: ticket.sla,
                            });
                        } else if (params.module === "INCIDENT") {
                            updateTicketIncident({
                                ticketId: params.ticketId,
                                updateFields: second_level.update_fields,
                                sla: ticket.sla,
                            });
                        }
                    }
                }
            }
            break;
        }
        case "RESOLVING_ASSURANCE_ESCALATION_3": {
            const result = calculateResolvingAssuranceEscalation3Overdue(
                ticket,
                holidays,
                workingTime
            );
            if (!result || !result.overdueAmount) break;
            if (result.isOverdue && result.overdueAmount <= deta) {
                const third_level = resolving_assurance?.third_level;
                if (third_level) {
                    if (third_level.notify_to.length) {
                        sendSlaNotification({
                            ticket,
                            module: params.module,
                            templateCode: "T010",
                            resOverdueTime: revOverdue?.overdueTime,
                            receivers: third_level.notify_to,
                        });
                    }
                    if (third_level.update_fields.length) {
                        if (params.module === "REQUEST") {
                            updateTicketRequest({
                                ticketId: params.ticketId,
                                updateFields: third_level.update_fields,
                                sla: ticket.sla,
                            });
                        } else if (params.module === "INCIDENT") {
                            updateTicketIncident({
                                ticketId: params.ticketId,
                                updateFields: third_level.update_fields,
                                sla: ticket.sla,
                            });
                        }
                    }
                }
            }
            break;
        }
        case "RESOLVING_ASSURANCE_ESCALATION_4": {
            const result = calculateResolvingAssuranceEscalation4Overdue(
                ticket,
                holidays,
                workingTime
            );
            if (!result || !result.overdueAmount) break;
            if (result.isOverdue && result.overdueAmount <= deta) {
                const four_level = resolving_assurance?.four_level;
                if (four_level) {
                    if (four_level.notify_to.length) {
                        sendSlaNotification({
                            ticket,
                            module: params.module,
                            templateCode: "T010",
                            resOverdueTime: revOverdue?.overdueTime,
                            receivers: four_level.notify_to,
                        });
                    }
                    if (four_level.update_fields.length) {
                        if (params.module === "REQUEST") {
                            updateTicketRequest({
                                ticketId: params.ticketId,
                                updateFields: four_level.update_fields,
                                sla: ticket.sla,
                            });
                        } else if (params.module === "INCIDENT") {
                            updateTicketIncident({
                                ticketId: params.ticketId,
                                updateFields: four_level.update_fields,
                                sla: ticket.sla,
                            });
                        }
                    }
                }
            }
            break;
        }
        default: {
            throw new Error("Unknown location " + params.where);
        }
    }
    return success.ok(ticket.sla);
}

export function calculateResponseAssuranceOverdue(
    ticket: { sla: ISla; created_time: string },
    holidays: IHoliday[],
    workingTime: IWorkingTime
):
    | { isOverdue: boolean; overdueAmount?: number; overdueTime: Date }
    | undefined {
    const createdTime = new Date(ticket.created_time);
    const { response_assurance, include_holiday }: ISla = ticket.sla;
    const timeLimit = response_assurance?.time_limit;
    if (response_assurance && timeLimit) {
        const timeLimitInMs = timeLimit * 60 * 1000;
        const overdueTime = calculateOverdueTime(
            workingTime,
            createdTime,
            timeLimitInMs,
            holidays,
            include_holiday
        );
        const { isOverdue, actualTime, overdueAmount } =
            isResponseAssuranceOverdue(
                response_assurance.determine_by,
                ticket,
                overdueTime
            );

        Object.assign(response_assurance, {
            is_overdue: isOverdue,
            actual_time: actualTime,
            overdue_amount: overdueAmount,
            overdue_time: overdueTime,
        });
        return { overdueAmount, isOverdue, overdueTime };
    }
    return undefined;
}

export function calculateResponseAssuranceEscalation1Overdue(
    ticket: { sla: ISla; created_time: string },
    holidays: IHoliday[],
    workingTime: IWorkingTime
):
    | { isOverdue: boolean; overdueAmount?: number; overdueTime: Date }
    | undefined {
    const createdTime = new Date(ticket.created_time);
    const { response_assurance, include_holiday }: ISla = ticket.sla;
    const first_level = response_assurance?.first_level;
    if (response_assurance && first_level && first_level.amount_time) {
        let timeLimit = response_assurance.time_limit;
        if (first_level.type === "BEFORE_OVERDUE") {
            timeLimit -= first_level.amount_time;
        } else if (first_level.type === "AFTER_OVERDUE") {
            timeLimit += first_level.amount_time;
        }
        const timeLimitInMs = timeLimit * 60 * 1000;
        const overdueTime = calculateOverdueTime(
            workingTime,
            createdTime,
            timeLimitInMs,
            holidays,
            include_holiday
        );
        const { isOverdue, overdueAmount } = isResponseAssuranceOverdue(
            response_assurance.determine_by,
            ticket,
            overdueTime
        );
        Object.assign(first_level, { is_overdue: isOverdue });
        return { overdueAmount, isOverdue, overdueTime };
    }
    return undefined;
}

export function calculateResponseAssuranceEscalation2Overdue(
    ticket: { sla: ISla; created_time: string },
    holidays: IHoliday[],
    workingTime: IWorkingTime
):
    | { isOverdue: boolean; overdueAmount?: number; overdueTime: Date }
    | undefined {
    const createdTime = new Date(ticket.created_time);
    const { response_assurance, include_holiday }: ISla = ticket.sla;
    const second_level = response_assurance?.second_level;
    if (response_assurance && second_level && second_level.amount_time) {
        let timeLimit = response_assurance.time_limit;
        if (second_level.type === "BEFORE_OVERDUE") {
            timeLimit -= second_level.amount_time;
        } else if (second_level.type === "AFTER_OVERDUE") {
            timeLimit += second_level.amount_time;
        }
        const timeLimitInMs = timeLimit * 60 * 1000;
        const overdueTime = calculateOverdueTime(
            workingTime,
            createdTime,
            timeLimitInMs,
            holidays,
            include_holiday
        );
        const { isOverdue, overdueAmount } = isResponseAssuranceOverdue(
            response_assurance.determine_by,
            ticket,
            overdueTime
        );
        Object.assign(second_level, { is_overdue: isOverdue });
        return { overdueAmount, isOverdue, overdueTime };
    }
    return undefined;
}

export function calculateResolvingAssuranceOverdue(
    ticket: { sla: ISla; created_time: string },
    holidays: IHoliday[],
    workingTime: IWorkingTime
):
    | { isOverdue: boolean; overdueAmount?: number; overdueTime: Date }
    | undefined {
    const createdTime = new Date(ticket.created_time);
    const { resolving_assurance, include_holiday }: ISla = ticket.sla;
    const timeLimit = resolving_assurance?.time_limit;
    if (resolving_assurance && timeLimit) {
        const timeLimitInMs = timeLimit * 60 * 1000;
        const overdueTime = calculateOverdueTime(
            workingTime,
            createdTime,
            timeLimitInMs,
            holidays,
            include_holiday
        );
        const { isOverdue, actualTime, overdueAmount, nonCountDuration } =
            isResolvingAssuranceOverdue(
                ticket,
                workingTime,
                holidays,
                include_holiday,
                timeLimitInMs
            );
        overdueTime.addMillisecond(nonCountDuration);
        Object.assign(resolving_assurance, {
            is_overdue: isOverdue,
            actual_time: actualTime,
            overdue_amount: overdueAmount,
            overdue_time: overdueTime,
        });
        return { overdueAmount, isOverdue, overdueTime };
    }
    return undefined;
}

export function calculateResolvingAssuranceEscalation1Overdue(
    ticket: { sla: ISla; created_time: string },
    holidays: IHoliday[],
    workingTime: IWorkingTime
):
    | { isOverdue: boolean; overdueAmount?: number; overdueTime: Date }
    | undefined {
    const createdTime = new Date(ticket.created_time);
    const { resolving_assurance, include_holiday }: ISla = ticket.sla;
    const first_level = resolving_assurance?.first_level;
    if (resolving_assurance && first_level && first_level.amount_time) {
        let timeLimit = resolving_assurance.time_limit;
        if (first_level.type === "BEFORE_OVERDUE") {
            timeLimit -= first_level.amount_time;
        } else if (first_level.type === "AFTER_OVERDUE") {
            timeLimit += first_level.amount_time;
        }
        const timeLimitInMs = timeLimit * 60 * 1000;
        const overdueTime = calculateOverdueTime(
            workingTime,
            createdTime,
            timeLimitInMs,
            holidays,
            include_holiday
        );
        const { isOverdue, overdueAmount } = isResolvingAssuranceOverdue(
            ticket,
            workingTime,
            holidays,
            include_holiday,
            timeLimitInMs
        );
        Object.assign(first_level, { is_overdue: isOverdue });
        return { overdueAmount, isOverdue, overdueTime };
    }
    return undefined;
}

export function calculateResolvingAssuranceEscalation2Overdue(
    ticket: { sla: ISla; created_time: string },
    holidays: IHoliday[],
    workingTime: IWorkingTime
):
    | { isOverdue: boolean; overdueAmount?: number; overdueTime: Date }
    | undefined {
    const createdTime = new Date(ticket.created_time);
    const { resolving_assurance, include_holiday }: ISla = ticket.sla;
    const second_level = resolving_assurance?.second_level;
    if (resolving_assurance && second_level && second_level.amount_time) {
        let timeLimit = resolving_assurance.time_limit;
        if (second_level.type === "BEFORE_OVERDUE") {
            timeLimit -= second_level.amount_time;
        } else if (second_level.type === "AFTER_OVERDUE") {
            timeLimit += second_level.amount_time;
        }
        const timeLimitInMs = timeLimit * 60 * 1000;
        const overdueTime = calculateOverdueTime(
            workingTime,
            createdTime,
            timeLimitInMs,
            holidays,
            include_holiday
        );
        const { isOverdue, overdueAmount } = isResolvingAssuranceOverdue(
            ticket,
            workingTime,
            holidays,
            include_holiday,
            timeLimitInMs
        );
        Object.assign(second_level, { is_overdue: isOverdue });
        return { overdueAmount, isOverdue, overdueTime };
    }
    return undefined;
}

export function calculateResolvingAssuranceEscalation3Overdue(
    ticket: { sla: ISla; created_time: string },
    holidays: IHoliday[],
    workingTime: IWorkingTime
):
    | { isOverdue: boolean; overdueAmount?: number; overdueTime: Date }
    | undefined {
    const createdTime = new Date(ticket.created_time);
    const { resolving_assurance, include_holiday }: ISla = ticket.sla;
    const third_level = resolving_assurance?.third_level;
    if (resolving_assurance && third_level && third_level.amount_time) {
        let timeLimit = resolving_assurance.time_limit;
        if (third_level.type === "BEFORE_OVERDUE") {
            timeLimit -= third_level.amount_time;
        } else if (third_level.type === "AFTER_OVERDUE") {
            timeLimit += third_level.amount_time;
        }
        const timeLimitInMs = timeLimit * 60 * 1000;
        const overdueTime = calculateOverdueTime(
            workingTime,
            createdTime,
            timeLimitInMs,
            holidays,
            include_holiday
        );
        const { isOverdue, overdueAmount } = isResolvingAssuranceOverdue(
            ticket,
            workingTime,
            holidays,
            include_holiday,
            timeLimitInMs
        );
        Object.assign(third_level, { is_overdue: isOverdue });
        return { overdueAmount, isOverdue, overdueTime };
    }
    return undefined;
}

export function calculateResolvingAssuranceEscalation4Overdue(
    ticket: { sla: ISla; created_time: string },
    holidays: IHoliday[],
    workingTime: IWorkingTime
):
    | { isOverdue: boolean; overdueAmount?: number; overdueTime: Date }
    | undefined {
    const createdTime = new Date(ticket.created_time);
    const { resolving_assurance, include_holiday }: ISla = ticket.sla;
    const four_level = resolving_assurance?.four_level;
    if (resolving_assurance && four_level && four_level.amount_time) {
        let timeLimit = resolving_assurance.time_limit;
        if (four_level.type === "BEFORE_OVERDUE") {
            timeLimit -= four_level.amount_time;
        } else if (four_level.type === "AFTER_OVERDUE") {
            timeLimit += four_level.amount_time;
        }
        const timeLimitInMs = timeLimit * 60 * 1000;
        const overdueTime = calculateOverdueTime(
            workingTime,
            createdTime,
            timeLimitInMs,
            holidays,
            include_holiday
        );
        const { isOverdue, overdueAmount } = isResolvingAssuranceOverdue(
            ticket,
            workingTime,
            holidays,
            include_holiday,
            timeLimitInMs
        );
        Object.assign(four_level, { is_overdue: isOverdue });
        return { overdueAmount, isOverdue, overdueTime };
    }
    return undefined;
}
