import { handleValidation } from "app";
import { RequestHandler } from "express";
import { body, query, ValidationChain } from "express-validator";

export const findValidator = (): (ValidationChain | RequestHandler)[] => [
    query("query", "query must be string").optional().isString(),
    query("sort", "sort must be string").optional().isString(),
    query("size").replace([null, undefined], 10),
    query("page").replace([null, undefined], 0),

    query("size", "size must be integer and in [1:50] or equal -1")
        .isInt({
            min: -1,
            max: 50,
        })
        .custom((v) => v != 0),
    query("page", "page must be integer and greater than -1").isInt({ min: 0 }),
    query("tenant").customSanitizer((value, { req }) => {
        if (!req.payload.roles.includes("SA")) {
            return req.payload.tenant;
        } else {
            return value;
        }
    }),

    handleValidation,
];

export const createValidator = (): (ValidationChain | RequestHandler)[] => [
    body("name", "name must be string").isString().bail().notEmpty(),
    body("description", "description must be string")
        .isString()
        .bail()
        .optional(),
    body("is_active", "is_active must be boolean").optional().isBoolean(),
    query("tenant").customSanitizer((value, { req }) => {
        if (!req.payload.roles.includes("SA")) {
            return req.payload.tenant;
        } else {
            return value;
        }
    }),
    query("tenant", "tenant must be string and not empty")
        .isString()
        .bail()
        .notEmpty(),
    handleValidation,
];

export const updateValidator = (): (ValidationChain | RequestHandler)[] => [
    body("name", "name must be string").optional().isString().bail().notEmpty(),
    body("description", "description must be string")
        .isString()
        .bail()
        .optional(),
    body("is_active", "is_active must be boolean").optional().isBoolean(),
    handleValidation,
];

export const createStatusValidator = (): (
    | ValidationChain
    | RequestHandler
)[] => [
    body("name", "name must be string").isString().bail().notEmpty(),
    body("description", "description must be string")
        .isString()
        .bail()
        .optional(),
    body("is_active", "is_active must be boolean").optional().isBoolean(),
    body("count_time", "count_time must be boolean").optional().isBoolean(),
    query("tenant").customSanitizer((value, { req }) => {
        if (!req.payload.roles.includes("SA")) {
            return req.payload.tenant;
        } else {
            return value;
        }
    }),
    query("tenant", "tenant must be string and not empty")
        .isString()
        .bail()
        .notEmpty(),
    handleValidation,
];

export const updateStatusValidator = (): (
    | ValidationChain
    | RequestHandler
)[] => [
    body("name", "name must be string").isString().bail().optional(),
    body("description", "description must be string")
        .isString()
        .bail()
        .optional(),
    body("count_time", "count_time must be boolean").isBoolean().optional(),
    body("is_active", "is_active must be boolean").optional().isBoolean(),
    handleValidation,
];

export const activationValidator = (): (ValidationChain | RequestHandler)[] => [
    body("ids", "ids must be array of string").isArray().notEmpty(),
    body("status", "status must be boolean").isBoolean().notEmpty(),
    handleValidation,
];

export const getAllDataValidator = (): (ValidationChain | RequestHandler)[] => [
    query("tenant", "tenant must be string").isString().bail().optional(),
    query("is_active", "is_active must be boolean").optional().isBoolean(),
    handleValidation,
];
