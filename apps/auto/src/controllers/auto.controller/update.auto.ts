import {
    HttpError,
    HttpStatus,
    Result,
    ResultError,
    error,
    success,
} from "app";
import { AutoPriority, UpdateAutoReqBody } from "../../interfaces/request";
import Auto from "../../models/auto.model";
import { FilterQuery } from "mongoose";
import { IAuto } from "../../interfaces/model";
import { buildMatchingRule } from "./build.auto";
import { getPossibleData } from "./field.auto";
import { getGroupByIdInfo } from "../../services";
import { getUserByIds } from "../../services/user.service";
import { checkAutoExists } from "./common.auto";
import logger from "logger";

export async function updateAuto(
    params: UpdateAutoReqBody & {
        autoId: string;
        tenant: string;
        userId: string;
        type: string
    }
): Promise<Result> {
    const filter: FilterQuery<IAuto> = {
        is_delete: false,
        type: params.type,
        id: params.autoId,
    };
    params.tenant && (filter.tenant = params.tenant);
    const session = await Auto.startSession();
    session.startTransaction();
    // if (!auto) {
    //     return error.notFound({
    //         value: params.autoId,
    //         param: "autoId",
    //         location: "param",
    //         message: `the auto ${params.autoId} does not exist`,
    //     });
    // }
    const group = await getGroupByIdInfo({
        tenant: params.tenant,
        group: params.group as string,
    });
    let memberGroup;
    if (
        params.apply_tech?.type == "EXCEPT" ||
        params.apply_tech?.type == "ONLINE"
    ) {
        const members = await getUserByIds(
            params.apply_tech?.techs as string[]
        );
        const group = await getGroupByIdInfo({
            tenant: params.tenant,
            group: params.group as string,
        });

        if (members.body?.length !== params.apply_tech.techs?.length) {
            return error.notFound({
                param: "members",
                value: params.apply_tech.techs,
                location: "param",
                message: `the members  does not exist`,
            });
        }
        if (params.apply_tech.type == "EXCEPT") {
            let numberMemberGroup = group.body?.members.length as number;
            numberMemberGroup = group.body?.leader
                ? numberMemberGroup + 1
                : numberMemberGroup;
            if (numberMemberGroup === params.apply_tech.techs?.length) {
                return error.invalidData({
                    location: "apply_tech.techs && EXECPT",
                    value: params.apply_tech.techs,
                    message: "Can't EXCEPT all of you",
                });
            }
        }
        memberGroup = {
            type: params.apply_tech?.type,
            techs: members.body,
        };
    }
    if (params.apply_tech?.type == "ALL") {
        params.apply_tech.techs = [];
    }
    if (params.apply_tech?.type == "ONLY") {
        const members = await getUserByIds(params.apply_tech.techs as string[]);
        if (params.apply_tech.techs?.length == 1) {
            memberGroup = {
                type: params.apply_tech.type,
                techs: members.body,
            };
        } else {
            return error.invalidData({
                location: "apply_tech.techs && ONLY",
                value: params.apply_tech.techs,
                message: "Only one member can be selected from the group",
            });
        }
    }
    if (params.name) {
        await checkAutoExists({
            name: params.name,
            tenant: params.tenant,
            autoId: params.autoId,
            type: params.type
        });
    }
    const auto = await Auto.findOneAndUpdate(
        filter,
        {
            $set: {
                name: params.name,
                tenant: params.tenant,
                description: params.description,
                is_active: params.is_active,
                updated_time: new Date(),
                apply_request: params.apply_request,
                auto_type: params.auto_type,
                apply_time: params.apply_time,
                group: params.group ? group.body : params.group,
                apply_tech:
                    params.apply_tech?.type == "EXCEPT" ||
                        params.apply_tech?.type == "ONLINE" ||
                        params.apply_tech?.type == "ONLY"
                        ? memberGroup
                        : params.apply_tech,
                is_apply: params.is_apply,
                updated_by: params.userId,
            },
        },
        { new: true }
    );

    try {
        if (!auto) {
            throw new HttpError(
                error.notFound({
                    location: "query",
                    param: "autoId",
                    value: params.autoId,
                    message: "the auto does not exist",
                })
            );
        }
        const tenant = auto.tenant;
        // const groups: string[] = getUpdatingGroup(params);
        // params.resolving_assurance?.first_level?.update_fields
        //     .filter((f) => f.field === "group" && f.value)
        //     .map((f) => f.value);

        // const [possibleData, groupMembers] = await Promise.all([
        //     getPossibleData({ tenant }),
        //     getMembersOfGroups(tenant, groups),
        // ]);
        const possibleData = await getPossibleData({ tenant, type: auto.type });
        if (params.conditions) {
            buildMatchingRule(auto, params.conditions, possibleData);
        }

        await auto.save({ session });
        await session.commitTransaction();
        session.endSession();
        return success.ok({
            ...auto.toObject(),
            is_deleted: undefined,
            _id: undefined,
        });
    } catch (err) {
        await session.abortTransaction();
        session.endSession();
        throw err;
    }
}

export async function deleteAuto(params: {
    autoId: string[];
}): Promise<Result> {
    const auto = await Auto.updateMany(
        { id: { $in: params.autoId }, is_delete: false },
        { is_delete: true },
        { new: true }
    );
    if (auto.modifiedCount != 0) {
        return success.ok({ message: "Delete successfully" });
    } else {
        return error.notFound({
            location: "body",
            param: "id",
            value: params.autoId,
            message: "the auto does not exist",
        });
    }
}

export async function updateAutoPriority(params: {
    priority: AutoPriority[];
    tenant: string;
    type: string;
}): Promise<Result> {
    const auto = await Auto.find({
        tenant: params.tenant,
        is_delete: false,
        type: params.type,
    });
    const mapPriority: Map<string, number> = new Map();
    const setPriorityValue: Set<number> = new Set();
    const priorityValueToLarge: AutoPriority[] = [];
    const priorityValueDuplidated: AutoPriority[] = [];
    const priorityIdDuplicated: AutoPriority[] = [];
    const autoNotExists: string[] = [];
    for (const priority of params.priority) {
        const s = auto.find((s) => s.id === priority.id);
        if (!s) {
            autoNotExists.push(priority.id);
        } else {
            let isOke = true;
            if (mapPriority.has(priority.id)) {
                priorityIdDuplicated.push(priority);
                isOke = false;
            }
            if (priority.priority > auto.length) {
                priorityValueToLarge.push(priority);
                isOke = false;
            }
            if (setPriorityValue.has(priority.priority)) {
                priorityValueDuplidated.push(priority);
                isOke = false;
            }
            if (isOke) {
                mapPriority.set(priority.id, priority.priority);
                setPriorityValue.add(priority.priority);
            }
        }
    }
    const invalidDataError: Omit<ResultError, "errors"> & {
        errors: NonNullable<ResultError["errors"]>;
    } = {
        status: HttpStatus.BAD_REQUEST,
        code: "INVALID_DATA",
        errors: [],
    };
    if (autoNotExists.length > 0) {
        invalidDataError.errors.push({
            location: "body",
            param: "*.id",
            value: autoNotExists,
            message: "some auto is not exist",
        });
    }
    if (priorityIdDuplicated.length > 0) {
        invalidDataError.errors.push({
            location: "body",
            param: "*.id",
            value: priorityIdDuplicated,
            message: "some auto is duplicated",
        });
    }
    if (priorityValueToLarge.length > 0) {
        invalidDataError.errors.push({
            location: "body",
            param: "*.priority",
            value: priorityValueToLarge,
            message: "some priority value too large",
        });
    }
    if (priorityValueDuplidated.length > 0) {
        invalidDataError.errors.push({
            location: "body",
            param: "*.priority",
            value: priorityValueDuplidated,
            message: "some priority value is duplidated",
        });
    }
    if (invalidDataError.errors.length > 0) {
        return invalidDataError;
    } else {
        await Auto.bulkWrite(
            params.priority.map((o) => ({
                updateOne: {
                    filter: { tenant: params.tenant, id: o.id },
                    update: { $set: { priority: o.priority } },
                },
            }))
        );
        return success.ok({ message: "success" });
    }
}

export async function deleteDepartment(params: {
    ids: string[];
    tenant: string
}): Promise<Result> {
    const auto = await Auto.find({ tenant: params.tenant });
    for (let i = 0; i < auto.length; i++) {
        const e = auto[i];
        const value = e.conditions.find(e => e.field?.name === "department")?.values
        const ids_final = value?.filter(value => params.ids.includes(value));
        if (value?.length === 1) {
            await Auto.updateMany({ "conditions.field.name": "department", "conditions.values": { $in: ids_final }, tenant: params.tenant }, { $pull: { conditions: { "field.name": "department" } } })
        } else {

            if (value?.length === ids_final?.length) {
                await Auto.updateMany({ "conditions.field.name": "department", tenant: params.tenant }, {
                    $pull: {
                        "conditions": {
                            "field.name": "department",
                            "values": ids_final
                        }
                    }
                })
            } else {
                await Auto.updateMany({ "conditions.field.name": "department", tenant: params.tenant }, { $pull: { "conditions.$[elem].values": { $in: ids_final } } }, { arrayFilters: [{ "elem.field.name": "department" }] })

            }
        }

    }
    return success.ok(auto)
}