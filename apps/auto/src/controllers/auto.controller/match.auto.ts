import { IAuto } from "../../interfaces/model/auto";
import Auto from "../../models/auto.model";
import { Result, error, success } from "app";
import logger from "logger";
import { getMembersOfGroup } from "../../services";
import { getUserByIds } from "../../services/user.service";

type members = {
    id: string;
    fullname: string;
    email: string;
    tenant: string;
    is_active: boolean;
    is_auto: boolean;
    last_time_ticket: Date;
}[];

export async function findMatchingAutoForTicket(
    ticket: {
        tenant: string;
    },
    apply_request: string,
    type: string
): Promise<Result> {
    const tenant = ticket.tenant;
    //TODO: check ticket
    const autos: IAuto[] = await Auto.aggregate([
        {
            $match: {
                tenant,
                is_active: true,
                is_apply: true,
                is_delete: false,
                type,
            },
        },
        { $project: { _id: 0 } },
        { $sort: { priority: 1 } },
    ]);
    let result: IAuto | undefined = undefined;
    let isAutoFound = false;
    for (let i = 0; i < autos.length; i++) {
        let allConditionPassed = true;
        const rule = autos[i];
        for (let j = 0; j < rule.conditions.length; j++) {
            const condition = rule.conditions[j];
            const location = condition.field.location;
            const actualValue = resolveValue(ticket, location) as string;
            if (!condition.values.includes(actualValue)) {
                allConditionPassed = false;
            }
        }
        if (allConditionPassed) {
            isAutoFound = true;
        }
        if (isAutoFound === true) {
            result = autos[i];
            break;
        }
    }
    if (result === undefined) {
        return error.notFound({
            location: "body",
            message: "can not find auto matches with ticket",
        });
    } else {
        // logger.info("autos ====>   %o", result)
        const layzy_peope = {
            group: {
                id: result.group.id,
                name: result.group.name,
            },
        };
        const infoGroup = await getMembersOfGroup({
            group: result.group.id as string,
            tenant: result.group.tenant
        });
        const checkAuto =
            result.group &&
            result.apply_time.type == "ALL_TIME" &&
            result.auto_type == "ROUND_ROBIN" &&
            result.is_apply == true &&
            result.is_active == true &&
            result.is_delete == false &&
            result.apply_request.includes(apply_request) == true;
        if (checkAuto && result.apply_tech.type == "ALL") {
            const getMembers = infoGroup.body?.filter(
                (e) => e.is_auto == true || !e.is_auto || !e.last_time_ticket
            );
            const time = await getLastTimeAssigneeTicket(getMembers as members);
            infoGroup.body?.forEach((e) => {
                const conditions =
                    !e.is_auto ||
                    !e.last_time_ticket ||
                    e.is_auto == (false as boolean);
                if (
                    new Date(e.last_time_ticket).getTime() ===
                    time?.getTime() ||
                    conditions
                ) {
                    return Object.assign(layzy_peope, e);
                }
            });
        } else if (checkAuto && result.apply_tech.type == "ONLINE") {
            const arrMemberAuto: string[] = [];
            result.apply_tech.techs?.forEach((e) => {
                arrMemberAuto.push(e.id);
            });
            const users = await getUserByIds(arrMemberAuto);
            const time = await getLastTimeAssigneeTicket(users.body as members);
            users.body?.forEach((e) => {
                const conditions =
                    !e.is_auto ||
                    !e.last_time_ticket ||
                    e.is_auto == (false as boolean);
                if (
                    new Date(e.last_time_ticket).getTime() ===
                    time?.getTime() ||
                    conditions
                ) {
                    return Object.assign(layzy_peope, e);
                }
            });
        } else if (checkAuto && result.apply_tech.type == "EXCEPT") {
            const mixMembers = infoGroup.body?.concat(
                result.apply_tech.techs as unknown as members
            );

            const arrMemberAuto: string[] = [];
            const resultMembers = getNonOverlappingObjects(
                mixMembers as members
            );

            logger.info("test %o", resultMembers);
            resultMembers?.forEach((e) => {
                arrMemberAuto.push(e.id);
            });
            const users = await getUserByIds(arrMemberAuto);
            const time = await getLastTimeAssigneeTicket(users.body as members);
            users.body?.forEach((e) => {
                const conditions =
                    !e.is_auto ||
                    !e.last_time_ticket ||
                    e.is_auto == (false as boolean);
                if (
                    new Date(e.last_time_ticket).getTime() ===
                    time?.getTime() ||
                    conditions
                ) {
                    delete e.activities;
                    return Object.assign(layzy_peope, e);
                }
            });
        } else if (checkAuto && result.apply_tech.type == "ONLY") {
            const ids: string[] = [];
            result.apply_tech.techs?.forEach((e) => {
                ids.push(e.id);
            });
            const user_apply = await getUserByIds(ids);
            user_apply.body?.forEach((e) => {
                delete e.activities;
                return Object.assign(layzy_peope, e);
            });
            // Object.assign(layzy_peope, user_apply.body[0] as unknown as UserResBody)
        } else {
            return error.notFound({
                location: "body",
                message: "can not find auto matches with ticket",
            });
        }
        Object.assign(layzy_peope, {
            info_auto: { id: result.id, name: result.name },
        });
        return success.ok(layzy_peope);
    }
}

async function getLastTimeAssigneeTicket(
    dates: {
        id?: string;
        fullname?: string;
        email?: string;
        phone?: string;
        department?: string;
        position?: string;
        is_active?: boolean;
        created_time?: Date;
        updated_time?: Date;
        is_auto?: boolean;
        tenant?: string;
        last_time_ticket?: Date;
    }[]
): Promise<Date> {
    const dates_final: (Date | undefined)[] = [];
    dates?.forEach((e) => {
        dates_final.push(new Date(e.last_time_ticket?.toString() as string));
    });
    return new Date(Math.min.apply(null, dates_final as any));
}

function resolveValue(obj: object, path: string): unknown {
    const parts = path.split(".");
    for (let i = 0; i < parts.length; i++) {
        try {
            obj = Reflect.get(obj, parts[i]);
        } catch (error) {
            return undefined;
        }
    }
    return obj;
}

function getNonOverlappingObjects(array: members): members {
    const nonOverlappingObjects = [];

    for (let i = 0; i < array.length; i++) {
        let isOverlapping = false;

        for (let j = 0; j < array.length; j++) {
            if (i !== j && array[i]["id"] === array[j]["id"]) {
                isOverlapping = true;
                break;
            }
        }

        if (!isOverlapping) {
            nonOverlappingObjects.push(array[i]);
        }
    }

    return nonOverlappingObjects;
}
