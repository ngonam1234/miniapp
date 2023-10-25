import {
    HttpError,
    HttpStatus,
    Result,
    ResultError,
    error,
    success,
} from "app";
import { FilterQuery } from "mongoose";
import { ISla } from "../../interfaces/model";
import { SlaOrderItem, UpdateSlaReqBody } from "../../interfaces/request";
import Sla from "../../model/sla";
import {
    buildMatchingRule,
    buildResolvingAssurance,
    buildResponseAssurance,
    getUpdatingGroup,
} from "./build.sla";
import {
    checkResolvingAssurance,
    checkResponseAssurance,
    checkSlaExists,
    checkTimeLimit,
} from "./common.sla";
import { getMembersOfGroups, getPossibleData } from "./field.sla";

export async function updateSlaOrder(params: {
    order: SlaOrderItem[];
    tenant: string;
    module: string;
}): Promise<Result> {
    const slas = await Sla.find({
        tenant: params.tenant,
        is_deleted: false,
        module: params.module,
    });
    const mapOrder: Map<string, number> = new Map();
    const setOrderValue: Set<number> = new Set();
    const orderValueToLarge: SlaOrderItem[] = [];
    const orderValueDuplidated: SlaOrderItem[] = [];
    const orderIdDuplicated: SlaOrderItem[] = [];
    const slaNotExists: string[] = [];
    for (const order of params.order) {
        const s = slas.find((s) => s.id === order.id);
        if (!s) {
            slaNotExists.push(order.id);
        } else {
            let isOke = true;
            if (mapOrder.has(order.id)) {
                orderIdDuplicated.push(order);
                isOke = false;
            }
            if (order.order > slas.length) {
                orderValueToLarge.push(order);
                isOke = false;
            }
            if (setOrderValue.has(order.order)) {
                orderValueDuplidated.push(order);
                isOke = false;
            }
            if (isOke) {
                mapOrder.set(order.id, order.order);
                setOrderValue.add(order.order);
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
    if (slaNotExists.length > 0) {
        invalidDataError.errors.push({
            location: "body",
            param: "*.id",
            value: slaNotExists,
            message: "some sla is not exist",
        });
    }
    if (orderIdDuplicated.length > 0) {
        invalidDataError.errors.push({
            location: "body",
            param: "*.id",
            value: orderIdDuplicated,
            message: "some sla is duplicated",
        });
    }
    if (orderValueToLarge.length > 0) {
        invalidDataError.errors.push({
            location: "body",
            param: "*.order",
            value: orderValueToLarge,
            message: "some order value too large",
        });
    }
    if (orderValueDuplidated.length > 0) {
        invalidDataError.errors.push({
            location: "body",
            param: "*.order",
            value: orderValueDuplidated,
            message: "some order value is duplidated",
        });
    }
    if (invalidDataError.errors.length > 0) {
        return invalidDataError;
    } else {
        await Sla.bulkWrite(
            params.order.map((o) => ({
                updateOne: {
                    filter: { tenant: params.tenant, id: o.id },
                    update: { $set: { order: o.order } },
                },
            }))
        );
        return success.ok({ message: "success" });
    }
}

export async function updateSla(
    params: {
        tenant?: string;
        userId: string;
        slaId: string;
    } & UpdateSlaReqBody
): Promise<Result> {
    if (!params.resolving_assurance?.time_limit) {
        params.resolving_assurance = undefined;
    }
    if (!params.response_assurance?.time_limit) {
        params.response_assurance = undefined;
    }
    checkTimeLimit(params.response_assurance, params.resolving_assurance);
    checkResponseAssurance(params.response_assurance);
    checkResolvingAssurance(params.resolving_assurance);

    const filter: FilterQuery<ISla> = {
        is_deleted: false,
        id: params.slaId,
    };
    params.tenant && (filter.tenant = params.tenant);
    const session = await Sla.startSession();
    session.startTransaction();
    const sla = await Sla.findOneAndUpdate(
        filter,
        {
            $set: {
                name: params.name,
                is_active: params.is_active,
                description: params.description,
                working_time: params.working_time,
                include_holiday: params.include_holiday,
                updated_by: params.userId,
                updated_time: new Date(),
            },
        },
        { session, new: true }
    );
    try {
        if (!sla) {
            throw new HttpError(
                error.notFound({
                    location: "query",
                    param: "slaId",
                    value: params.slaId,
                    message: "the sla does not exist",
                })
            );
        }
        const { tenant, module } = sla;
        const groups: string[] = getUpdatingGroup(params);
        params.resolving_assurance?.first_level?.update_fields
            .filter((f) => f.field === "group" && f.value)
            .map((f) => f.value);

        const promises: [
            Promise<Record<string, string[]>>,
            Promise<Record<string, string[]>>,
            Promise<void> | undefined
        ] = [
                getPossibleData({ tenant, module }),
                getMembersOfGroups(tenant, groups),
                undefined,
            ]
        if (params.name) {
            promises.push(
                checkSlaExists({
                    name: params.name,
                    tenant: params.tenant,
                    slaId: params.slaId,
                    module: sla.module,
                })
            );
        }
        const [possibleData, groupMembers] = await Promise.all(promises);
        buildMatchingRule(sla, params.matching_rule, possibleData);
        buildResponseAssurance(
            sla,
            params.response_assurance,
            possibleData,
            groupMembers
        );
        buildResolvingAssurance(
            sla,
            params.resolving_assurance,
            possibleData,
            groupMembers
        );

        await sla.save({ session });
        await session.commitTransaction();
        session.endSession();
        return success.ok({
            ...sla.toObject(),
            is_deleted: undefined,
            _id: undefined,
        });
    } catch (err) {
        await session.abortTransaction();
        session.endSession();
        throw err;
    }
}

export async function deleteSla(params: {
    slaId: string;
    userId: string;
    tenant?: string;
}): Promise<Result> {
    const filter: FilterQuery<ISla> = {
        is_deleted: false,
        id: params.slaId,
    };
    params.tenant && (filter.tenant = params.tenant);
    const sla = await Sla.findOneAndUpdate(filter, {
        $set: { is_deleted: true },
    });
    if (!sla) {
        return error.notFound({
            location: "query",
            param: "slaId",
            value: params.slaId,
            message: "the sla does not exist",
        });
    }
    return success.ok({ message: "success" });
}
