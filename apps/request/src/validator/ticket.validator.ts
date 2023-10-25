import { handleValidation } from "app";
import { RequestHandler } from "express";
import { ValidationChain, body, query } from "express-validator";
import Joi from "joi";
import { notString } from "utils";

export const findTicketValidator = (): (ValidationChain | RequestHandler)[] => [
    query("query", "query must be string").optional().isString(),
    query("sort", "sort must be string").optional().isString(),
    query("page").replace([null, undefined], 0),
    query("size").replace([null, undefined], 10),

    query("size", "size must be integer and in [1:50]").isInt({
        min: 1,
        max: 50,
    }),
    query("page", "page must be integer and greater than -1").isInt({ min: 0 }),
    query("tenant").customSanitizer((value, { req }) => {
        if (!req.payload.roles.includes("SA")) {
            return req.payload.tenant;
        } else {
            return value;
        }
    }),
    // TODO: Write validator for start, end, type
    query("start").optional(),
    query("end").optional(),
    query("type").optional(),
    handleValidation,
];

export const findTicketNotConnectValidator = (): (
    | ValidationChain
    | RequestHandler
)[] => [
    query("query", "query must be string").optional().isString(),
    query("sort", "sort must be string").optional().isString(),
    query("page").replace([null, undefined], 0),
    query("size").replace([null, undefined], 10),

    query("size", "size must be integer and in [1:50]").isInt({
        min: 1,
        max: 50,
    }),
    query("page", "page must be integer and greater than -1").isInt({ min: 0 }),
    query("tenant").customSanitizer((value, { req }) => {
        if (!req.payload.roles.includes("SA")) {
            return req.payload.tenant;
        } else {
            return value;
        }
    }),
    query("type").optional(),
    handleValidation,
];

export const findTicketWithAdvancedFilterValidator = Joi.object({
    query: Joi.string().optional().allow(""),
    sort: Joi.string().optional().allow(""),
    page: Joi.number().integer().min(0).default(0),
    size: Joi.number().integer().min(-1).max(50).not(0).default(10),

    start: Joi.optional(),
    end: Joi.optional(),
    type: Joi.optional(),
    sla: Joi.boolean(),
    departments: Joi.array().items(Joi.string()),
    requesters: Joi.array().items(Joi.string()),
    services: Joi.array().items(Joi.string()),
    types: Joi.array().items(Joi.string()),
    priorities: Joi.array().items(Joi.string()),
    groups: Joi.array().items(Joi.string()),
    technicians: Joi.array().items(Joi.string()),
    response_assurance: Joi.boolean(),
    resolving_assurance: Joi.boolean(),
});

export const createTicketValidator = (): (
    | ValidationChain
    | RequestHandler
)[] => [
    body("name", "name must be string").isString().bail().notEmpty(),
    body("description", "description must be string")
        .isString()
        .bail()
        .notEmpty(),
    body("requester", "requester must be string")
        .optional()
        .isString()
        .bail()
        .notEmpty(),
    body("template", "template must be string").isString().bail().notEmpty(),
    body("fields").replace([null, undefined], {}),
    body("fields.*", "the value in fields must be string")
        .optional()
        .isString(),
    body("attachments").replace([null, undefined], []),
    body("attachments", "attachments must be array of string")
        .isArray()
        .bail()
        .custom((id) => !id.some(notString)),
    body("watchers").replace([null, undefined], []),
    body("watchers", "watchers must be array of string")
        .isArray()
        .bail()
        .custom((id) => !id.some(notString)),
    handleValidation,
];

export const updateTicketValidator = (): (
    | ValidationChain
    | RequestHandler
)[] => [
    // TODO: reWrite this validator
    body("name", "name must be string").optional(),
    body("description", "description must be string").optional(),
    body("requester", "requester must be string").optional(),
    body("fields").replace([null, undefined], {}),
    body("fields.*", "the value in fields must be string")
        .optional()
        .isString(),
    body("attachments").replace([null, undefined], []),
    body("attachments", "attachments must be array of string")
        .isArray()
        .bail()
        .custom((id) => !id.some(notString)),
    body("watchers").replace([null, undefined], []),
    body("watchers", "watchers must be array of string")
        .isArray()
        .bail()
        .custom((id) => !id.some(notString)),
    body("note").optional(),
    handleValidation,
];

export const updateTicketResolutionSchema = Joi.object({
    solution: Joi.object({
        content: Joi.string().allow(""),
        attachments: Joi.array().items(Joi.string()),
    }).required(),
});

export const updateTicketStatusValidator = (): (
    | ValidationChain
    | RequestHandler
)[] => [
    body("status", "status must be string").isString().bail().notEmpty(),
    body("note", "note must be string").optional().isString().bail().notEmpty(),
    handleValidation,
];

export const commentTicketValidator = (): (
    | ValidationChain
    | RequestHandler
)[] => [
    body("content", "conent must be string").exists().bail().notEmpty(),
    // TODO: write validator for id, reply_comment, attachments, created_time, is_view_eu, creator
    body("id").optional(),
    body("reply_comment").optional(),
    body("attachments").optional(),
    body("created_time").optional(),
    body("is_view_eu").optional(),
    body("creator").optional(),
    handleValidation,
];

export const editCommentTicketValidator = (): (
    | ValidationChain
    | RequestHandler
)[] => [
    // TODO: write validator for id, content, attachments, is_view_eu
    body("id").optional(),
    body("content").optional(),
    body("id_comment").optional(),
    body("attachments").optional(),
    body("is_view_eu").optional(),
    handleValidation,
];

export const exportTicketSLAValidator = Joi.object({
    start: Joi.optional(),
    end: Joi.optional(),
    file: Joi.optional(),
    type: Joi.optional(),
    sla: Joi.boolean(),
    departments: Joi.array().items(Joi.string()),
    requesters: Joi.array().items(Joi.string()),
    services: Joi.array().items(Joi.string()),
    types: Joi.array().items(Joi.string()),
    priorities: Joi.array().items(Joi.string()),
    groups: Joi.array().items(Joi.string()),
    technicians: Joi.array().items(Joi.string()),
    response_assurance: Joi.boolean(),
    resolving_assurance: Joi.boolean(),
});

export const exportTicketValidator = Joi.object({
    start: Joi.optional(),
    end: Joi.optional(),
    file: Joi.optional(),
    type: Joi.optional(),
    departments: Joi.array().items(Joi.string()),
    requesters: Joi.array().items(Joi.string()),
    services: Joi.array().items(Joi.string()),
    types: Joi.array().items(Joi.string()),
    priorities: Joi.array().items(Joi.string()),
    groups: Joi.array().items(Joi.string()),
    technicians: Joi.array().items(Joi.string()),
    response_assurance: Joi.boolean(),
    resolving_assurance: Joi.boolean(),
});

export const importTicketValidator = (): (
    | ValidationChain
    | RequestHandler
)[] => [
    body().isArray().withMessage("Request body must be array"),
    // TODO: reWrite this validator if(body is array)
    body("*.name")
        .isString()
        .notEmpty()
        .withMessage("name must be string and not empty"),
    body("*.fields.status")
        .isString()
        .notEmpty()
        .withMessage("status must be string and not empty"),
    body("*.fields.group")
        .isString()
        .notEmpty()
        .withMessage("group must be string and not empty"),
    body("*.fields.type")
        .optional()
        .isString()
        .withMessage("type must be string"),
    body("*.fields.description")
        .optional()
        .isString()
        .withMessage("description must be string"),
    body("*.fields.requester")
        .optional()
        .isString()
        .withMessage("requester must be string"),
    body("*.fields.channel")
        .optional()
        .isString()
        .withMessage("channel must be string"),
    body("*.fields.technician")
        .optional()
        .isString()
        .withMessage("technician must be string"),
    body("*.fields.priority")
        .optional()
        .isString()
        .withMessage("priority must be string"),
    body("*.fields.service")
        .optional()
        .isString()
        .withMessage("service must be string"),
    body("*.fields.sub_service")
        .optional()
        .isString()
        .withMessage("sub_service must be string"),
    body("*.fields.sub_services_L2")
        .optional()
        .isString()
        .withMessage("sub_services_L2 must be string"),
    handleValidation,
];
