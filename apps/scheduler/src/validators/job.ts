import Joi from "joi";

export const createJobSchema = Joi.object({
    tags: Joi.array().items(Joi.string().required()).default([]),
    type: Joi.valid("ONE_TIME", "RECURRING").required(),
    expression: Joi.string(),
    execution_time: Joi.date(),
    execution: Joi.object({
        type: Joi.valid("HTTP_REQ").required(),
        http_request: Joi.object({
            url: Joi.string().required(),
            method: Joi.valid("GET", "POST", "PUT", "DELETE").required(),
            headers: Joi.array()
                .items(
                    Joi.object({
                        name: Joi.string().required(),
                        value: Joi.string().required(),
                    })
                )
                .default([]),
            params: Joi.array()
                .items(
                    Joi.object({
                        name: Joi.string().required(),
                        value: Joi.string().required(),
                    })
                )
                .default([]),
            data: Joi.string().optional(),
        }).required(),
    }).required(),
});

export const createJobsSchema = Joi.array().items(createJobSchema);
export const cancelJobsSchema = Joi.array().items(Joi.string());
