import Joi from "joi";

export const slaQuerySchema = Joi.object({
    module: Joi.valid("REQUEST", "INCIDENT").required(),
    tenant: Joi.string(),
});

export const findSlaSchema = Joi.object({
    query: Joi.string().allow(""),
    sort: Joi.string().allow(""),
    page: Joi.number().integer().min(0).default(0),
    size: Joi.number().integer().min(-1).max(50).not(0).default(10),
    module: Joi.valid("REQUEST", "INCIDENT").required(),
});

const levelEscalationSchema = Joi.object({
    type: Joi.valid("BEFORE_OVERDUE", "AFTER_OVERDUE").required(),
    amount_time: Joi.number().integer().min(0).required(),
    notify_to: Joi.array()
        .items(
            Joi.object({
                type: Joi.valid("PEOPLE", "GROUP").required(),
                recipient: Joi.string().required(),
            })
        )
        .default([]),
    update_fields: Joi.array()
        .items(
            Joi.object({
                field: Joi.string().required(),
                value: Joi.string().required(),
            })
        )
        .default([]),
});

export const createSlaShema = Joi.object({
    name: Joi.string().required(),
    description: Joi.string().allow(""),
    is_active: Joi.boolean(),
    include_holiday: Joi.boolean(),
    working_time: Joi.valid("8x5", "24x7", "24x5").required(),
    matching_rule: Joi.object({
        type: Joi.valid("AND", "OR").required(),
        conditions: Joi.array()
            .items(
                Joi.object({
                    field: Joi.string().required(),
                    values: Joi.array().items(Joi.string()).required(),
                })
            )
            .required(),
    }),

    response_assurance: Joi.object({
        determine_by: Joi.valid("CHANGE_STATUS", "FIRST_RESPONSE").required(),
        time_limit: Joi.number().integer().min(0).required(),
        first_level: levelEscalationSchema,
        second_level: levelEscalationSchema,
    }),

    resolving_assurance: Joi.object({
        time_limit: Joi.number().integer().min(0).required(),
        first_level: levelEscalationSchema,
        second_level: levelEscalationSchema,
        third_level: levelEscalationSchema,
        four_level: levelEscalationSchema,
    }),
});

export const updateSlaSchema = createSlaShema.keys({
    name: Joi.string(),
    working_time: Joi.valid("8x5", "24x7", "24x5"),
});

export const updateSlaOrderSchema = Joi.array().items(
    Joi.object({
        id: Joi.string().required(),
        order: Joi.number().integer().min(1).required(),
    })
);

export const getFieldDataSchema = Joi.object({
    module: Joi.valid("REQUEST", "INCIDENT").required(),
    field: Joi.string().required(),
    tenant: Joi.string(),
    query: Joi.string().allow(""),
    group: Joi.string().when("field", {
        is: "technician",
        then: Joi.string().required(),
    }),
});
