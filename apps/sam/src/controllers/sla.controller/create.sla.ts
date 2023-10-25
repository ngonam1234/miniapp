import { Result, success } from "app";
import mongoose from "mongoose";
import { v1 } from "uuid";
import { CreateSlaReqBody } from "../../interfaces/request";
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

export async function createSla(
    params: CreateSlaReqBody & {
        tenant: string;
        userId: string;
        module: string;
    }
): Promise<Result> {
    const { name, tenant, module } = params;
    if (!params.resolving_assurance?.time_limit) {
        params.resolving_assurance = undefined;
    }
    if (!params.response_assurance?.time_limit) {
        params.response_assurance = undefined;
    }
    checkTimeLimit(params.response_assurance, params.resolving_assurance);
    checkResponseAssurance(params.response_assurance);
    checkResolvingAssurance(params.resolving_assurance);

    const session = await mongoose.startSession();
    const groups: string[] = getUpdatingGroup(params);

    const [possibleData, groupMembers] = await Promise.all([
        getPossibleData({ tenant, module }),
        getMembersOfGroups(tenant, groups),
        checkSlaExists({ name, tenant, module }),
    ]);
    session.startTransaction();
    const sla = new Sla({
        id: v1(),
        module: params.module,
        name: params.name,
        tenant: params.tenant,
        description: params.description,
        working_time: params.working_time,
        include_holiday: params.include_holiday,
        is_active: params.is_active,
        created_by: params.userId,
        created_time: new Date(),
        order: 1,
    });
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

    try {
        await Sla.updateMany(
            { tenant: params.tenant, module: params.module },
            { $inc: { order: 1 } },
            { session }
        );
        await sla.save({ session });
        await session.commitTransaction();
    } catch (e) {
        await session.abortTransaction();
        throw e;
    } finally {
        session.endSession();
    }
    return success.created({
        ...sla.toObject(),
        is_deleted: undefined,
        _id: undefined,
    });
}
