import { Result, success } from "app";
import { resolveValue } from "utils";
import { actualWorkingTime } from "../../controllers/time.controller";
import { IHoliday, ISla, IWorkingTime } from "../../interfaces/model";
import { CreateJobReqBody } from "../../interfaces/request";
import {
    cancelJobs,
    createJobs,
    getHolidays,
    getWorkingTime,
    sendSlaNotification,
    updateTicketIncident,
    updateTicketRequest,
} from "../../services";
import {
    calculateResolvingAssuranceEscalation1Overdue,
    calculateResolvingAssuranceEscalation2Overdue,
    calculateResolvingAssuranceEscalation3Overdue,
    calculateResolvingAssuranceEscalation4Overdue,
    calculateResolvingAssuranceOverdue,
    calculateResponseAssuranceEscalation1Overdue,
    calculateResponseAssuranceEscalation2Overdue,
    calculateResponseAssuranceOverdue,
    createCheckJobBody,
} from "./action.sla";

export async function calculateSlaForTicket(
    ticket: {
        id: string;
        created_time: string;
        sla: ISla;
    },
    firstTime = false
): Promise<Result> {
    const jobs: CreateJobReqBody[] = [];
    const { working_time, response_assurance, resolving_assurance }: ISla =
        ticket.sla;
    const responseAssuranceOld = { ...response_assurance };
    const resolvingAssuranceOld = { ...resolving_assurance };
    const holidays = getHolidays();
    const workingTime = getWorkingTime(working_time);
    const resOverdue = calculateResponseAssuranceOverdue(
        ticket,
        holidays,
        workingTime
    );
    if (resOverdue) {
        const resIsOverdueOld = resolveValue(responseAssuranceOld, "isOverdue");
        if (!resIsOverdueOld && resOverdue.isOverdue) {
            sendSlaNotification({
                ticket,
                templateCode: "T007",
                module: ticket.sla.module,
                resOverdueTime: resOverdue.overdueTime,
            });
        } else if (
            !resIsOverdueOld &&
            !resOverdue.isOverdue &&
            resOverdue.overdueTime > new Date()
        ) {
            const time = new Date(resOverdue.overdueTime);
            time.addMillisecond(Date.now());
            jobs.push(
                createCheckJobBody({
                    time: time,
                    ticket_id: ticket.id,
                    where: "RESPONSE_ASSURANCE",
                    module: ticket.sla.module,
                })
            );
        }
        const resOverdueEsc1 = calculateResponseAssuranceEscalation1Overdue(
            ticket,
            holidays,
            workingTime
        );
        if (resOverdueEsc1) {
            const resIsOverdueEsc1Old = resolveValue(
                responseAssuranceOld,
                "first_level.isOverdue"
            );
            if (!resIsOverdueEsc1Old && resOverdueEsc1.isOverdue) {
                const first_level = response_assurance?.first_level;
                if (first_level) {
                    if (first_level.notify_to.length) {
                        sendSlaNotification({
                            ticket,
                            templateCode: "T009",
                            module: ticket.sla.module,
                            resOverdueTime: resOverdue?.overdueTime,
                            receivers: first_level.notify_to,
                        });
                    }
                    if (first_level.update_fields.length) {
                        if (ticket.sla.module === "REQUEST") {
                            updateTicketRequest({
                                ticketId: ticket.id,
                                updateFields: first_level.update_fields,
                            });
                        } else if (ticket.sla.module === "INCIDENT") {
                            updateTicketIncident({
                                ticketId: ticket.id,
                                updateFields: first_level.update_fields,
                            });
                        }
                    }
                }
            } else if (
                !resIsOverdueEsc1Old &&
                !resOverdueEsc1.isOverdue &&
                resOverdueEsc1.overdueTime > new Date()
            ) {
                jobs.push(
                    createCheckJobBody({
                        time: resOverdueEsc1.overdueTime,
                        ticket_id: ticket.id,
                        where: "RESPONSE_ASSURANCE_ESCALATION_1",
                        module: ticket.sla.module,
                    })
                );
            }
        }
        const resOverdueEsc2 = calculateResponseAssuranceEscalation2Overdue(
            ticket,
            holidays,
            workingTime
        );
        if (resOverdueEsc2) {
            const resIsOverdueEsc2Old = resolveValue(
                responseAssuranceOld,
                "second_level.isOverdue"
            );
            if (!resIsOverdueEsc2Old && resOverdueEsc2.isOverdue) {
                const second_level = response_assurance?.second_level;
                if (second_level) {
                    if (second_level.notify_to.length) {
                        sendSlaNotification({
                            ticket,
                            templateCode: "T009",
                            module: ticket.sla.module,
                            resOverdueTime: resOverdue?.overdueTime,
                            receivers: second_level.notify_to,
                        });
                    }
                    if (second_level.update_fields.length) {
                        if (ticket.sla.module === "REQUEST") {
                            updateTicketRequest({
                                ticketId: ticket.id,
                                updateFields: second_level.update_fields,
                            });
                        } else if (ticket.sla.module === "INCIDENT") {
                            updateTicketIncident({
                                ticketId: ticket.id,
                                updateFields: second_level.update_fields,
                            });
                        }
                    }
                }
            } else if (
                !resIsOverdueEsc2Old &&
                !resOverdueEsc2.isOverdue &&
                resOverdueEsc2.overdueTime > new Date()
            ) {
                jobs.push(
                    createCheckJobBody({
                        time: resOverdueEsc2.overdueTime,
                        ticket_id: ticket.id,
                        where: "RESPONSE_ASSURANCE_ESCALATION_2",
                        module: ticket.sla.module,
                    })
                );
            }
        }
    }
    const revOverdue = calculateResolvingAssuranceOverdue(
        ticket,
        holidays,
        workingTime
    );
    if (revOverdue) {
        const revIsOverdueOld = resolveValue(
            resolvingAssuranceOld,
            "isOverdue"
        );
        if (!revIsOverdueOld && revOverdue.isOverdue) {
            sendSlaNotification({
                ticket,
                templateCode: "T008",
                module: ticket.sla.module,
                resOverdueTime: revOverdue.overdueTime,
            });
        } else if (
            !revIsOverdueOld &&
            !revOverdue.isOverdue &&
            revOverdue.overdueTime > new Date()
        ) {
            jobs.push(
                createCheckJobBody({
                    time: revOverdue.overdueTime,
                    ticket_id: ticket.id,
                    where: "RESOLVING_ASSURANCE",
                    module: ticket.sla.module,
                })
            );
        }
        const revOverdueEsc1 = calculateResolvingAssuranceEscalation1Overdue(
            ticket,
            holidays,
            workingTime
        );
        if (revOverdueEsc1) {
            const revIsOverdueEsc1Old = resolveValue(
                resolvingAssuranceOld,
                "first_level.isOverdue"
            );
            if (!revIsOverdueEsc1Old && revOverdueEsc1.isOverdue) {
                const first_level = resolving_assurance?.first_level;
                if (first_level) {
                    if (first_level.notify_to.length) {
                        sendSlaNotification({
                            ticket,
                            templateCode: "T010",
                            module: ticket.sla.module,
                            resOverdueTime: revOverdue?.overdueTime,
                            receivers: first_level.notify_to,
                        });
                    }
                    if (first_level.update_fields.length) {
                        if (ticket.sla.module === "REQUEST") {
                            updateTicketRequest({
                                ticketId: ticket.id,
                                updateFields: first_level.update_fields,
                            });
                        } else if (ticket.sla.module === "INCIDENT") {
                            updateTicketIncident({
                                ticketId: ticket.id,
                                updateFields: first_level.update_fields,
                            });
                        }
                    }
                }
            } else if (
                !revIsOverdueEsc1Old &&
                !revOverdueEsc1.isOverdue &&
                revOverdueEsc1.overdueTime > new Date()
            ) {
                jobs.push(
                    createCheckJobBody({
                        time: revOverdueEsc1.overdueTime,
                        ticket_id: ticket.id,
                        where: "RESOLVING_ASSURANCE_ESCALATION_1",
                        module: ticket.sla.module,
                    })
                );
            }
        }
        const revOverdueEsc2 = calculateResolvingAssuranceEscalation2Overdue(
            ticket,
            holidays,
            workingTime
        );
        if (revOverdueEsc2) {
            const revIsOverdueEsc2Old = resolveValue(
                resolvingAssuranceOld,
                "second_level.isOverdue"
            );
            if (!revIsOverdueEsc2Old && revOverdueEsc2.isOverdue) {
                const second_level = resolving_assurance?.second_level;
                if (second_level) {
                    if (second_level.notify_to.length) {
                        sendSlaNotification({
                            ticket,
                            templateCode: "T010",
                            module: ticket.sla.module,
                            resOverdueTime: revOverdue?.overdueTime,
                            receivers: second_level.notify_to,
                        });
                    }
                    if (second_level.update_fields.length) {
                        if (ticket.sla.module === "REQUEST") {
                            updateTicketRequest({
                                ticketId: ticket.id,
                                updateFields: second_level.update_fields,
                            });
                        } else if (ticket.sla.module === "INCIDENT") {
                            updateTicketIncident({
                                ticketId: ticket.id,
                                updateFields: second_level.update_fields,
                            });
                        }
                    }
                }
            } else if (
                !revIsOverdueEsc2Old &&
                !revOverdueEsc2.isOverdue &&
                revOverdueEsc2.overdueAmount
            ) {
                const time = new Date(revOverdueEsc2.overdueAmount);
                time.addMillisecond(Date.now());
                jobs.push(
                    createCheckJobBody({
                        time: time,
                        ticket_id: ticket.id,
                        where: "RESOLVING_ASSURANCE_ESCALATION_2",
                        module: ticket.sla.module,
                    })
                );
            }
        }
        const revOverdueEsc3 = calculateResolvingAssuranceEscalation3Overdue(
            ticket,
            holidays,
            workingTime
        );
        if (revOverdueEsc3) {
            const revIsOverdueEsc3Old = resolveValue(
                resolvingAssuranceOld,
                "third_level.isOverdue"
            );
            if (!revIsOverdueEsc3Old && revOverdueEsc3.isOverdue) {
                const third_level = resolving_assurance?.third_level;
                if (third_level) {
                    if (third_level.notify_to.length) {
                        sendSlaNotification({
                            ticket,
                            templateCode: "T010",
                            module: ticket.sla.module,
                            resOverdueTime: revOverdue?.overdueTime,
                            receivers: third_level.notify_to,
                        });
                    }
                    if (third_level.update_fields.length) {
                        if (ticket.sla.module === "REQUEST") {
                            updateTicketRequest({
                                ticketId: ticket.id,
                                updateFields: third_level.update_fields,
                            });
                        } else if (ticket.sla.module === "INCIDENT") {
                            updateTicketIncident({
                                ticketId: ticket.id,
                                updateFields: third_level.update_fields,
                            });
                        }
                    }
                }
            } else if (
                !revIsOverdueEsc3Old &&
                !revOverdueEsc3.isOverdue &&
                revOverdueEsc3.overdueAmount
            ) {
                const time = new Date(revOverdueEsc3.overdueAmount);
                time.addMillisecond(Date.now());
                jobs.push(
                    createCheckJobBody({
                        time: time,
                        ticket_id: ticket.id,
                        where: "RESOLVING_ASSURANCE_ESCALATION_3",
                        module: ticket.sla.module,
                    })
                );
            }
        }
        const revOverdueEsc4 = calculateResolvingAssuranceEscalation4Overdue(
            ticket,
            holidays,
            workingTime
        );
        if (revOverdueEsc4) {
            const revIsOverdueEsc4Old = resolveValue(
                resolvingAssuranceOld,
                "four_level.isOverdue"
            );
            if (!revIsOverdueEsc4Old && revOverdueEsc4.isOverdue) {
                const four_level = resolving_assurance?.four_level;
                if (four_level) {
                    if (four_level.notify_to.length) {
                        sendSlaNotification({
                            ticket,
                            templateCode: "T010",
                            module: ticket.sla.module,
                            resOverdueTime: revOverdue?.overdueTime,
                            receivers: four_level.notify_to,
                        });
                    }
                    if (four_level.update_fields.length) {
                        if (ticket.sla.module === "REQUEST") {
                            updateTicketRequest({
                                ticketId: ticket.id,
                                updateFields: four_level.update_fields,
                            });
                        } else if (ticket.sla.module === "INCIDENT") {
                            updateTicketIncident({
                                ticketId: ticket.id,
                                updateFields: four_level.update_fields,
                            });
                        }
                    }
                }
            } else if (
                !revIsOverdueEsc4Old &&
                !revOverdueEsc4.isOverdue &&
                revOverdueEsc4.overdueAmount
            ) {
                const time = new Date(revOverdueEsc4.overdueAmount);
                time.addMillisecond(Date.now());
                jobs.push(
                    createCheckJobBody({
                        time: time,
                        ticket_id: ticket.id,
                        where: "RESOLVING_ASSURANCE_ESCALATION_4",
                        module: ticket.sla.module,
                    })
                );
            }
        }
    }
    await createJobs(jobs);
    if (!firstTime) await cancelJobs([ticket.id]);
    return success.ok(ticket.sla);
}

export function isResponseAssuranceOverdue(
    determineBy: "CHANGE_STATUS" | "FIRST_RESPONSE",
    ticket: object,
    overdualTime: Date
): { isOverdue: boolean; actualTime?: Date; overdueAmount?: number } {
    const activities = resolveValue(ticket, "activities");
    const timestampNow = new Date().getTime();
    if (!Array.isArray(activities)) {
        const isOverdue = timestampNow > overdualTime.getTime();
        const overdueAmount = isOverdue
            ? timestampNow - overdualTime.getTime()
            : undefined;
        return { isOverdue, overdueAmount };
    }
    const activity = activities.find((a) => {
        switch (determineBy) {
            case "FIRST_RESPONSE": {
                const isPublish = resolveValue(a, "comment.is_view_eu");
                return a.action === "COMMENT" && isPublish === true;
            }
            case "CHANGE_STATUS": {
                if (a.action === "UPDATE") {
                    const updates = a.updates;
                    if (Array.isArray(updates)) {
                        return updates.some((u) => {
                            const field = resolveValue(u, "field.name");
                            const value = resolveValue(u, "new.id");
                            const id = "89e265d0-ad11-11ed-afa1-0242ac120002";
                            return field === "status" && value === id;
                        });
                    } else return false;
                } else return false;
            }
            default: {
                return false;
            }
        }
    });
    if (!activity?.time || typeof activity.time !== "string") {
        const isOverdue = timestampNow > overdualTime.getTime();
        const overdueAmount = isOverdue
            ? timestampNow - overdualTime.getTime()
            : undefined;
        return { isOverdue, overdueAmount };
    }
    const time = new Date(activity.time);
    const isOverdue = time.getTime() > overdualTime.getTime();
    const overdueAmount = isOverdue
        ? time.getTime() - overdualTime.getTime()
        : undefined;
    return { isOverdue, actualTime: time, overdueAmount };
}

export function isResolvingAssuranceOverdue(
    ticket: { created_time: string },
    workingTime: IWorkingTime,
    holidays: IHoliday[],
    includeHoliday: boolean,
    timeLimit: number
): {
    isOverdue: boolean;
    actualTime?: Date;
    overdueAmount?: number;
    nonCountDuration: number;
} {
    let nonCountDuration = 0;
    let actualTime = 0;
    const timestampNow = new Date().getTime();
    let time = new Date(ticket.created_time);
    const nodes = resolveValue(ticket, "workflow.nodes");
    const activities = resolveValue(ticket, "activities");
    if (!Array.isArray(activities) || !Array.isArray(nodes)) {
        const isOverdue = timestampNow - time.getTime() > timeLimit;
        const overdueAmount = isOverdue
            ? timestampNow - time.getTime() - timeLimit
            : undefined;
        return { isOverdue, overdueAmount, nonCountDuration };
    }
    let status = nodes.filter((n) => n.type === "STATUS" && n.status);
    status = status.map((n) => n.status);
    for (const activity of activities) {
        if (activity.action !== "UPDATE") continue;
        if (!Array.isArray(activity.updates)) continue;
        const timeUpdated = resolveValue(activity, "time");
        const strTimeUpdated = String(timeUpdated);
        if (!strTimeUpdated) continue;

        for (const update of activity.updates) {
            const field = resolveValue(update, "field.name");
            if (field !== "status") continue;

            const oldVal = resolveValue(update, "old.id");
            const newVal = resolveValue(update, "new.id");
            const oldStatus = status.find((s) => s.id === oldVal);
            const newStatus = status.find((s) => s.id === newVal);
            const countTime = resolveValue(oldStatus, "count_time");
            if (!oldStatus || !newStatus) continue;

            const startTime = new Date(time);
            const endTime = new Date(strTimeUpdated);
            time = endTime;

            if (countTime !== true) {
                nonCountDuration += actualWorkingTime(
                    { first: startTime, second: endTime },
                    workingTime,
                    holidays,
                    includeHoliday
                );
            } else {
                actualTime += actualWorkingTime(
                    { first: startTime, second: endTime },
                    workingTime,
                    holidays,
                    includeHoliday
                );
            }
            break;
        }
    }
    const currentStatusId = resolveValue(ticket, "status.id");
    const currentStatus = status.find((s) => s.id === currentStatusId);
    const countTime = resolveValue(currentStatus, "count_time");
    if (countTime == null || countTime === true) {
        actualTime += actualWorkingTime(
            { first: time, second: new Date() },
            workingTime,
            holidays,
            includeHoliday
        );
    }
    const isOverdue = actualTime > timeLimit;
    const overdueAmount = isOverdue ? actualTime - timeLimit : undefined;
    const strTime = resolveValue(ticket, "resolved_time");
    const lastStatusId = resolveValue(ticket, "status.id");
    const isResolved = lastStatusId === "89e271b0-ad11-11ed-afa1-0242ac120002";
    if (strTime && typeof strTime === "string" && isResolved) {
        const actualTime = new Date(strTime);
        return {
            isOverdue,
            actualTime,
            nonCountDuration,
            overdueAmount,
        };
    }
    return { isOverdue, overdueAmount, nonCountDuration };
}
