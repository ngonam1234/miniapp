import {
    HttpError,
    HttpStatus,
    Result,
    ResultSuccess,
    error,
    success,
} from "app";
import { Impact, Priority, PriorityMatrix, Urgency } from "../models";
import { v1 } from "uuid";
import {
    IImpactNPriority,
    IPriorityMatrix,
} from "../interfaces/models/priority-matrix";
import { FilterQuery } from "mongoose";
import {
    ImpactNPriorityResBody,
    LevelResBody,
} from "../interfaces/request/priority-matrix.body";
import { IImpact, IPriority, IUrgency } from "../interfaces/models";
import { checkTenantExist } from "../service";
import logger from "logger";

export async function deletePriorityMatrix(params: {
    urgency: string;
    priority: string;
    impact: string;
    tenant: string;
}): Promise<Result> {
    await Promise.all([
        checkPriority({
            tenant: params.tenant,
            priority: params.priority,
        }),
        checkUrgency({
            tenant: params.tenant,
            urgency: params.urgency,
        }),
        checkImpact({
            tenant: params.tenant,
            impact: params.impact,
        }),
        checkTenantExist(params.tenant),
    ]);
    const filter: FilterQuery<IPriorityMatrix> = {
        urgency: params.urgency,
        impact_priority_list: {
            $elemMatch: {
                impact: params.impact,
                priority: params.priority,
            },
        },
    };
    const update = {
        $pull: {
            impact_priority_list: {
                impact: { $eq: params.impact },
                priority: { $eq: params.priority },
            },
        },
    };
    const result = await PriorityMatrix.findOneAndUpdate(filter, update, {
        new: true,
    });
    if (!result) {
        return error.notFound({
            message: "the priority matrix not found",
        });
    }
    return success.ok({ message: "success" });
}

export async function getPriorityMatrix(params: {
    userRoles: string[];
    tenant?: string;
}): Promise<Result> {
    const [impacts, urgencies, priorities, priority_matrices] =
        await Promise.all([
            Impact.find({
                tenant: params.tenant,
                is_deleted: false,
                is_active: true,
            }),
            Urgency.find({
                tenant: params.tenant,
                is_deleted: false,
                is_active: true,
            }),
            Priority.find({
                tenant: params.tenant,
                is_deleted: false,
                is_active: true,
            }),
            PriorityMatrix.find({
                tenant: params.tenant,
                is_deleted: false,
            }).lean(),
        ]);

    if (impacts && urgencies && priorities && priority_matrices) {
        const new_priority_matrices: IPriorityMatrix[] = [];

        //get list matrices correctly order by urgencies, after that assigns into new_priority_matrices
        urgencies.map((urgency) => {
            const priority_matrix = priority_matrices.find(
                (obj) => obj.urgency === urgency.id
            );
            priority_matrix
                ? new_priority_matrices.push(priority_matrix)
                : new_priority_matrices.push({
                    id: "",
                    tenant: params.tenant as string,
                    urgency: urgency.id,
                    impact_priority_list: [],
                    is_deleted: undefined,
                });
        });

        //get list new_priority_matrices correctly order by impacts
        new_priority_matrices.map((new_priority_matrix) => {
            const impact_priority_list: IImpactNPriority[] = [];
            impacts.map((impact) => {
                //get first element of impact_priority_list have impact eq id of impact
                const impact_priority =
                    new_priority_matrix.impact_priority_list.find(
                        (obj) => obj.impact === impact.id
                    );
                impact_priority
                    ? impact_priority_list.push(impact_priority)
                    : impact_priority_list.push({
                        impact: impact.id,
                        priority: undefined,
                        created_by: undefined,
                        created_time: undefined,
                    });
            });
            new_priority_matrix.impact_priority_list = impact_priority_list;
        });

        const details_priority_matrices = await getDetailsPriorityMatrix({
            priority_matrices: new_priority_matrices,
            urgencies: urgencies,
            impacts: impacts,
            priorities: priorities,
        });

        return success.ok(details_priority_matrices.data);
    }
    return success.ok({});
}

async function getDetailsPriorityMatrix(params: {
    priority_matrices: IPriorityMatrix[];
    urgencies: IUrgency[];
    impacts: IImpact[];
    priorities: IPriority[];
}): Promise<ResultSuccess> {
    const { priority_matrices, urgencies, impacts, priorities } = params;
    const details_priority_matrices: (Omit<
        IPriorityMatrix,
        "urgency" | "impact_priority_list"
    > & {
        urgency: LevelResBody | undefined;
        impact_priority_list: ImpactNPriorityResBody[] | undefined;
    })[] = [];

    priority_matrices.map((priority_matrix) => {
        const details_priority_matrix: Omit<
            IPriorityMatrix,
            "urgency" | "impact_priority_list"
        > & {
            urgency: LevelResBody | undefined;
            impact_priority_list: ImpactNPriorityResBody[] | undefined;
        } = {
            ...priority_matrix,
            urgency: undefined,
            impact_priority_list: undefined,
        };

        //get urgency details
        const urgency = urgencies.find(
            (obj) => obj.id === priority_matrix.urgency
        );
        if (urgency) {
            details_priority_matrix.urgency = {
                id: urgency.id,
                name: urgency.name,
            };
        }

        //get impact_priority details
        const impact_priority_list: ImpactNPriorityResBody[] = [];

        priority_matrix.impact_priority_list?.map((impact_priority) => {
            const impact = impacts.find(
                (impact) => impact.id === impact_priority.impact
            );
            const priority = priorities.find(
                (priority) => priority.id === impact_priority.priority
            );
            if (impact) {
                const temp: ImpactNPriorityResBody = {
                    impact: {
                        id: impact.id,
                        name: impact.name,
                    },
                    priority: {
                        id: priority ? priority.id : undefined,
                        name: priority ? priority.name : undefined,
                    },
                    created_by: impact_priority.created_by,
                    created_time: impact_priority.created_time,
                };
                impact_priority_list.push(temp);
            }
        });
        details_priority_matrix.impact_priority_list = impact_priority_list;
        details_priority_matrices.push(details_priority_matrix);
    });

    return success.ok(details_priority_matrices);
}

export async function createPriorityMatrix(params: {
    userId: string;
    urgency: string;
    priority: string;
    impact: string;
    tenant: string;
}): Promise<Result> {
    const [response] = await Promise.all([
        PriorityMatrix.findOne({ urgency: params.urgency }),
        checkPriority({
            tenant: params.tenant,
            priority: params.priority,
        }),
        checkUrgency({
            tenant: params.tenant,
            urgency: params.urgency,
        }),
        checkImpact({
            tenant: params.tenant,
            impact: params.impact,
        }),
    ]);
    //if priority_matrix has urgency not exists
    if (!response) {
        const priorityMatrix = new PriorityMatrix({
            id: v1(),
            tenant: params.tenant,
            urgency: params.urgency,
            impact_priority_list: [
                {
                    impact: params.impact,
                    priority: params.priority,
                    created_by: params.userId,
                    created_time: new Date(),
                },
            ],
        });
        await priorityMatrix.save();
        return success.ok({
            ...priorityMatrix.toJSON(),
            _id: undefined,
        });
    }

    const filter: FilterQuery<IPriorityMatrix> = {
        urgency: params.urgency,
        impact_priority_list: {
            $elemMatch: {
                impact: params.impact,
            },
        },
    };
    const update = {
        $set: {
            "impact_priority_list.$.priority": params.priority,
            created_by: params.userId,
            created_time: new Date(),
        },
    };
    const priority_matrix = await PriorityMatrix.findOne(filter);
    //if add priority_matrix has dupplicate urgency & impact
    if (!priority_matrix) {
        response.impact_priority_list.push({
            impact: params.impact,
            priority: params.priority,
            created_by: params.userId,
            created_time: new Date(),
        });
    } else {
        await PriorityMatrix.updateOne(filter, update, {
            new: true,
            projection: { id: 0, _id: 0 },
        });
    }
    await response.save();
    return success.ok({
        ...response.toJSON(),
        _id: undefined,
    });
}

async function checkPriority(params: {
    tenant: string;
    priority: string;
}): Promise<void> {
    const priority = await Priority.findOne({
        is_deleted: false,
        is_active: true,
        id: params.priority,
    });
    if (!priority) {
        throw new HttpError({
            status: HttpStatus.NOT_FOUND,
            code: "NOT_FOUND",
            description: {
                en: "Priority not found",
                vi: "Mức độ ưu tiên không tồn tại",
            },
        });
    }
    if (priority.tenant !== params.tenant) {
        throw new HttpError({
            status: HttpStatus.BAD_REQUEST,
            code: "INVALID_DATA",
            errors: [
                {
                    param: "name",
                    location: "body",
                    value: params.tenant,
                },
            ],
        });
    }
}

async function checkUrgency(params: {
    tenant: string;
    urgency: string;
}): Promise<void> {
    const urgency = await Urgency.findOne({
        is_deleted: false,
        is_active: true,
        id: params.urgency,
    });
    if (!urgency) {
        throw new HttpError({
            status: HttpStatus.NOT_FOUND,
            code: "NOT_FOUND",
            description: {
                en: "Urgency not found",
                vi: "Mức độ khẩn cấp không tồn tại",
            },
        });
    }
    if (urgency.tenant !== params.tenant) {
        throw new HttpError({
            status: HttpStatus.BAD_REQUEST,
            code: "INVALID_DATA",
            errors: [
                {
                    param: "name",
                    location: "body",
                    value: params.tenant,
                },
            ],
        });
    }
}

async function checkImpact(params: {
    tenant: string;
    impact: string;
}): Promise<void> {
    const impact = await Impact.findOne({
        is_deleted: false,
        is_active: true,
        id: params.impact,
    });
    if (!impact) {
        throw new HttpError({
            status: HttpStatus.NOT_FOUND,
            code: "NOT_FOUND",
            description: {
                en: "Impact not found",
                vi: "Mức độ ảnh hưởng không tồn tại",
            },
        });
    }
    if (impact.tenant !== params.tenant) {
        throw new HttpError({
            status: HttpStatus.BAD_REQUEST,
            code: "INVALID_DATA",
            errors: [
                {
                    param: "name",
                    location: "body",
                    value: params.tenant,
                },
            ],
        });
    }
}

export async function getPriorityByImpactAndUrgency(params: {
    impact: string,
    urgency: string,
    tenant: string
}): Promise<{ id: string, name: string }[]> {
    const priority = await PriorityMatrix.aggregate([
        {
            $match: {
                "tenant": params.tenant,
                "is_deleted": false,
                "urgency": params.urgency
            }
        },
        {
            $unwind: "$impact_priority_list"
        },
        {
            $match: {
                "impact_priority_list.impact": params.impact
            }
        },
        {
            $project: {
                _id: 0,
                priority: "$impact_priority_list.priority"
            }
        }
    ]);
    if (priority) {
        const getPriority = await Priority.find({ id: priority[0]?.priority }, { id: 1, _id: 0, name: 1 })
        return getPriority; // Wrap the object in an array
    }
    return [{ id: "", name: "" }]; // Wrap the object in an array
}