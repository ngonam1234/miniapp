import { HttpError, HttpStatus, error } from "app";
import { FilterQuery } from "mongoose";
import { ISla } from "../../interfaces/model";
import { CreateSlaReqBody } from "../../interfaces/request";
import Sla from "../../model/sla";

export async function checkSlaExists(params: {
    name: string;
    tenant?: string;
    slaId?: string;
    module: string;
}): Promise<void> {
    const match: FilterQuery<ISla> = {
        name: {
            $regex: `^${params.name}$`,
            $options: "i",
        },
        is_deleted: false,
        module: params.module,
    };
    params.tenant ? (match.tenant = params.tenant) : null;
    const sla = await Sla.findOne(match);
    if (sla) {
        if (params.slaId === sla.id) {
            return;
        }
        throw new HttpError({
            status: HttpStatus.BAD_REQUEST,
            code: "INVALID_DATA",
            description: {
                en: "The service level agreement name is already existed",
                vi: "Tên cam kết chất lượng đã có trên hệ thống",
            },
            errors: [
                {
                    param: "name",
                    location: "body",
                    value: params.name,
                },
            ],
        });
    }
}

export function checkTimeLimit(
    responseAssurance: CreateSlaReqBody["response_assurance"],
    resolvingAssurance: CreateSlaReqBody["resolving_assurance"]
): void {
    if (responseAssurance && resolvingAssurance) {
        const timeLimit1 = responseAssurance.time_limit;
        const timeLimit2 = resolvingAssurance.time_limit;
        if (timeLimit1 > timeLimit2) {
            throw new HttpError(
                error.invalidData({
                    location: "body",
                    param: "resolving_assurance.time_limit",
                    value: timeLimit2,
                    message:
                        "the time limit of resolving assurance must " +
                        "not be less than response assurance",
                })
            );
        }
    }
}

export function checkResponseAssurance(
    assurance: CreateSlaReqBody["response_assurance"]
): void {
    if (!assurance) return;
    let { first_level, second_level } = assurance;
    if (!first_level?.amount_time) first_level = undefined;
    if (!second_level?.amount_time) second_level = undefined;
    const timelineOfFistEscalation = calulateTimelineOfEscalation(
        assurance.time_limit,
        first_level?.amount_time,
        first_level?.type
    );

    const timelineOfSecondEscalation = calulateTimelineOfEscalation(
        assurance.time_limit,
        second_level?.amount_time,
        second_level?.type
    );

    if (timelineOfFistEscalation && timelineOfFistEscalation < 0) {
        throw new HttpError(
            error.invalidData({
                location: "body",
                param: "response_assurance.first_level.amount_time",
                value: first_level?.amount_time,
                message:
                    "the timeline of first escalation " +
                    "must be greater zero",
            })
        );
    }

    if (second_level && !first_level) {
        throw new HttpError(
            error.invalidData({
                location: "body",
                param: "response_assurance.first_level",
                value: first_level,
                message:
                    "can not set the second escalation " +
                    "without the first escalation",
            })
        );
    }

    if (
        timelineOfFistEscalation != null &&
        timelineOfSecondEscalation != null &&
        timelineOfFistEscalation >= timelineOfSecondEscalation
    ) {
        throw new HttpError(
            error.invalidData({
                location: "body",
                param: "response_assurance.second_level.amount_time",
                value: second_level?.amount_time,
                message:
                    "the timeline of second escalation must greater " +
                    "than the timeline of first escalation",
            })
        );
    }
}

export function checkResolvingAssurance(
    assurance: CreateSlaReqBody["resolving_assurance"]
): void {
    if (!assurance) return;
    let { first_level, second_level, third_level, four_level } = assurance;
    if (!first_level?.amount_time) first_level = undefined;
    if (!second_level?.amount_time) second_level = undefined;
    if (!third_level?.amount_time) third_level = undefined;
    if (!four_level?.amount_time) four_level = undefined;

    const timelineOfFistEscalation = calulateTimelineOfEscalation(
        assurance.time_limit,
        first_level?.amount_time,
        first_level?.type
    );

    const timelineOfSecondEscalation = calulateTimelineOfEscalation(
        assurance.time_limit,
        second_level?.amount_time,
        second_level?.type
    );

    const timelineOfThirdEscalation = calulateTimelineOfEscalation(
        assurance.time_limit,
        third_level?.amount_time,
        third_level?.type
    );

    const timelineOfFourEscalation = calulateTimelineOfEscalation(
        assurance.time_limit,
        four_level?.amount_time,
        four_level?.type
    );
    function throwMissingPreviousLevelError(
        current: string,
        previous: string,
        value: unknown
    ): never {
        const name1 = current.split("_")[0];
        const name2 = previous.split("_")[0];
        throw new HttpError(
            error.invalidData({
                location: "body",
                param: `resolving_assurance.${current}`,
                message:
                    `can not set ${name1} escalation ` +
                    `without ${name2} escalation`,
                value,
            })
        );
    }

    function throwInvalidAmountTimeError(
        current: string,
        previous: string,
        value: unknown
    ): never {
        const name1 = current.split("_")[0];
        const name2 = previous.split("_")[0];
        throw new HttpError(
            error.invalidData({
                location: "body",
                param: `response_assurance.${current}.amount_time`,
                message:
                    `the timeline of ${name1} escalation must greater ` +
                    `than the timeline of ${name2} escalation`,
                value,
            })
        );
    }

    if (timelineOfFistEscalation && timelineOfFistEscalation < 0) {
        throw new HttpError(
            error.invalidData({
                location: "body",
                param: "resolving_assurance.first_level.amount_time",
                value: first_level?.amount_time,
                message:
                    "the timeline of first escalation " +
                    "must be greater zero",
            })
        );
    }

    if (second_level && !first_level) {
        throwMissingPreviousLevelError(
            "second_level",
            "first_level",
            second_level
        );
    }

    if (
        timelineOfFistEscalation != null &&
        timelineOfSecondEscalation != null &&
        timelineOfSecondEscalation <= timelineOfFistEscalation
    ) {
        throwInvalidAmountTimeError(
            "second_level",
            "first_level",
            second_level?.amount_time
        );
    }

    if (third_level && (!first_level || !second_level)) {
        const previous = !first_level ? "first_level" : "second_level";
        throwMissingPreviousLevelError("third_level", previous, third_level);
    }

    if (
        timelineOfSecondEscalation != null &&
        timelineOfThirdEscalation != null &&
        timelineOfThirdEscalation <= timelineOfSecondEscalation
    ) {
        throwInvalidAmountTimeError(
            "third_level",
            "second_level",
            third_level?.amount_time
        );
    }

    if (four_level && (!first_level || !second_level || !third_level)) {
        const previous = !first_level
            ? "first_level"
            : !second_level
                ? "second_level"
                : "third_level";
        throwMissingPreviousLevelError("four_level", previous, four_level);
    }

    if (
        timelineOfThirdEscalation != null &&
        timelineOfFourEscalation != null &&
        timelineOfFourEscalation <= timelineOfThirdEscalation
    ) {
        throwInvalidAmountTimeError(
            "four_level",
            "third_level",
            four_level?.amount_time
        );
    }
}

function calulateTimelineOfEscalation(
    timeLimit: number,
    amountTime: number | undefined,
    type: "BEFORE_OVERDUE" | "AFTER_OVERDUE" | undefined
): number | undefined {
    if (!amountTime || !type) {
        return undefined;
    }
    if (type == "AFTER_OVERDUE") {
        return timeLimit + amountTime;
    }
    if (type == "BEFORE_OVERDUE") {
        return timeLimit - amountTime;
    }
}
