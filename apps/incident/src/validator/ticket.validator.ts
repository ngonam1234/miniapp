import { handleValidation } from "app";
import { RequestHandler } from "express";
import { body, query, ValidationChain } from "express-validator";
import Joi from "joi";
import { notString } from "utils";

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

export const updateTicketResolutionValidator = (): (
    | ValidationChain
    | RequestHandler
)[] => [
    // TODO: reWrite this validator
    body("cause").optional(),
    body("solution").optional(),
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
