import { HttpError, Result, error, success } from "app";
import { CreateAutoReqBody } from "../../interfaces/request";
import Auto from "../../models/auto.model";
import { v1 } from "uuid";
import { getGroupByIdInfo } from "../../services";
import { IAuto } from "../../interfaces/model";
import mongoose from "mongoose";
import { document } from "../../models";
import { getUserByIds } from "../../services/user.service";
import { checkAutoExists } from "./common.auto";

const ticketFields = [
    {
        name: "service",
        location: "service.id",
        display: "Dịch vụ cha",
    },
    {
        name: "sub_service",
        location: "sub_service.id",
        display: "Dịch vụ con",
    },
    {
        name: "category",
        location: "category.id",
        display: "Category",
    },
    {
        name: "sub_category",
        location: "sub_category.id",
        display: "Sub-category",
    },
    {
        name: "type",
        location: "type.id",
        display: "Loại yêu cầu",
    },
    {
        name: "priority",
        location: "priority.id",
        display: "Mức độ ưu tiên",
    },
    {
        name: "impact",
        location: "impact.id",
        display: "Mức độ ảnh hưởng",
    },
    {
        name: "urgency",
        location: "urgency.id",
        display: "Mức độ khẩn cấp",
    },
    {
        name: "group",
        location: "group.id",
        display: "Nhóm hỗ trợ",
    },
    {
        name: "sub_services_L2",
        location: "sub_services_L2.id",
        display: "Dịch vụ cấp 3",
    },
    {
        name: "department",
        location: "requester.department.id",
        display: "Phòng ban",
    },
    {
        name: "impact",
        location: "impact.id",
        display: "Mức độ ảnh hưởng",
    },
    {
        name: "urgency",
        location: "urgency.id",
        display: "Mức độ khẩn cấp",
    },
];

export async function createAuto(
    params: CreateAutoReqBody & {
        tenant: string;
        userId: string;
        type: string;
    }
): Promise<Result> {
    const group = await getGroupByIdInfo({
        tenant: params.tenant,
        group: params.group,
    });
    if (group.status === 404) {
        return error.notFound({
            param: "groupId",
            value: params.group,
            location: "param",
            message: `the group ${params.group} does not exist`,
        });
    }
    const session = await mongoose.startSession();
    session.startTransaction();
    let memberGroup;
    if (
        params.apply_tech.type == "EXCEPT" ||
        params.apply_tech.type == "ONLINE"
    ) {
        const members = await getUserByIds(params.apply_tech.techs as string[]);
        const group = await getGroupByIdInfo({
            tenant: params.tenant,
            group: params.group,
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
                    message: "Can't except all of you",
                });
            }
        }
        memberGroup = {
            type: params.apply_tech.type,
            techs: members.body,
        };
    }
    if (params.apply_tech.type == "ONLY") {
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
    const auto = new Auto({
        id: v1(),
        name: params.name.replace(/ +(?= )/g, "").trim(),
        tenant: params.tenant,
        description: params.description?.replace(/ +(?= )/g, "").trim(),
        is_active: params.is_active,
        created_time: new Date(),
        created_by: params.userId,
        apply_request: params.apply_request,
        auto_type: params.auto_type,
        apply_time: params.apply_time,
        group: group.body,
        apply_tech:
            params.apply_tech.type == "EXCEPT" ||
            params.apply_tech.type == "ONLINE" ||
            params.apply_tech.type == "ONLY"
                ? memberGroup
                : params.apply_tech,
        is_apply: params.is_apply,
        priority: 1,
        type: params.type,
    });
    await checkAutoExists({
        name: params.name,
        tenant: params.tenant,
        type: params.type
    });
    if (params.conditions) {
        buildMatchingRule(auto, params.conditions);
    }
    try {
        await Auto.updateMany(
            { tenant: params.tenant, type: params.type },
            { $inc: { priority: 1 } },
            { session }
        );
        await auto.save({ session });
        await session.commitTransaction();
        session.endSession();
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        throw error;
    }
    return success.created({
        ...auto.toJSON(),
        _id: undefined,
    });
}

function buildMatchingRule(
    auto: document<IAuto>,
    rule: NonNullable<CreateAutoReqBody["conditions"]>
): void {
    const setField: Set<string> = new Set();
    const conditions = rule.map((con, i) => {
        const field = ticketFields.find((f) => f.name === con.field);
        if (!field) {
            throw new HttpError(
                error.invalidData({
                    value: con,
                    location: "body",
                    param: `condition[${i}]`,
                    message: `unknown field ${con.field}`,
                })
            );
        } else {
            if (setField.has(field.name)) {
                throw new HttpError(
                    error.invalidData({
                        value: con,
                        location: "body",
                        param: `condition[${i}]`,
                        message: `field ${con.field} is duplicated`,
                    })
                );
            }
            setField.add(field.name);
            // TODO check condition value
            return { field, values: con.values };
        }
    });
    auto.conditions = conditions;
}

export async function checkNameAuto(
    name: string,
    tenant: string
): Promise<boolean> {
    const checkName = await Auto.findOne({
        name: name,
        tenant: tenant,
        is_delete: false,
    });
    if (checkName) return true;
    else return false;
}
