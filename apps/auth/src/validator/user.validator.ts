import { handleValidation } from "app";
import { RequestHandler } from "express";
import { body, query, ValidationChain } from "express-validator";
import { notString } from "utils";

export const createUserValidator = (): (ValidationChain | RequestHandler)[] => [
    body("email", "email must be string and not empty")
        .isString()
        .bail()
        .notEmpty(),
    body("fullname", "fullName must be string").optional().isString(),
    body("password", "password must be string").isString().bail().notEmpty(),
    body("department", "department must be string").optional().isString(),
    body("position", "position must be string").optional().isString(),
    body("roles").replace([null, undefined], []),
    body("roles", "roles must be array of string").optional().isArray(),
    body("is_active").replace([null, undefined], true),
    body("is_active", "is_active must boolean").exists().bail().isBoolean(),
    query("tenant").customSanitizer((value, { req }) => {
        if (!req.payload.roles.includes("SA")) {
            return req.payload.tenant;
        } else {
            return value;
        }
    }),
    // check tenant if user creating is not SA
    query("tenant", "tenant must be string and not empty").custom(
        (tenant, { req }) => {
            if (!req.body.roles || !Array.isArray(req.body.roles)) {
                return true;
            }
            return !(!tenant && !req.body.roles.includes("SA"));
        }
    ),
    handleValidation,
];

export const updateUserValidator = (): (ValidationChain | RequestHandler)[] => [
    body("fullname", "fullname must be string").optional().isString(),
    body("phone", "phone must be string").optional().isString(),
    body("department", "department must be string").optional().isString(),
    body("position", "position must be string").optional().isString(),
    body("is_active", "is_active must be true or false").optional().isBoolean(),
    body("roles", "roles must be array of string").optional().isArray(),
    handleValidation,
];

export const findUserValidator = (): (ValidationChain | RequestHandler)[] => [
    query("query", "query must be string").optional().isString(),
    query("sort", "sort must be string").optional().isString(),
    query("size").replace([null, undefined], 10),
    query("page").replace([null, undefined], 0),
    query("size", "size must be integer and in [1:50] or equal -1")
        .isInt({ min: -1, max: 50 })
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

export const findUserInternalValidator = (): (
    | ValidationChain
    | RequestHandler
)[] => [
    query("query", "query must be string").optional().isString(),
    query("tenant", "tenant must be string").optional().isString(),
    query("sort", "sort must be string").optional().isString(),
    query("size").replace([null, undefined], 10),
    query("page").replace([null, undefined], 0),
    query("size", "size must be integer and in [1:50] or equal -1")
        .isInt({ min: -1, max: 50 })
        .custom((v) => v != 0),
    query("page", "page must be integer and greater than -1").isInt({ min: 0 }),
    query("is_active", "is_active must be boolean").optional().isBoolean(),
    handleValidation,
];

export const findUsersNotCustomerPortal = (): (
    | ValidationChain
    | RequestHandler
)[] => [
    query("query", "query must be string").optional().isString(),
    query("sort", "sort must be string").optional().isString(),
    query("tenant").customSanitizer((value, { req }) => {
        if (!req.payload.roles.includes("SA")) {
            return req.payload.tenant;
        } else {
            return value;
        }
    }),
    handleValidation,
];

export const findUserByIdsValidator = (): (
    | ValidationChain
    | RequestHandler
)[] => [
    body("ids", "ids must be array of string")
        .notEmpty()
        .bail()
        .isArray()
        .bail()
        .custom((id) => !id.some(notString)),
    handleValidation,
];

export const updateActivationValidator = (): (
    | ValidationChain
    | RequestHandler
)[] => [
    body("status", "status must boolean").exists().bail().isBoolean(),
    body("ids", "ids must be array of string")
        .notEmpty()
        .bail()
        .isArray()
        .bail()
        .custom((id) => !id.some(notString)),
    handleValidation,
];

export const importUserValidator = (): (ValidationChain | RequestHandler)[] => [
    body().isArray().withMessage("body must be array of user"),
    body("*.index", "index must be integer and greater than -1")
        .if(body().isArray())
        .isInt({
            min: 0,
        }),
    body("*.email", "email must be string and not empty")
        .if(body().isArray())
        .isString()
        .bail()
        .notEmpty(),
    body("*.password", "password must be string and not empty")
        .if(body().isArray())
        .optional()
        .isString(),
    body("*.fullname", "fullname must be string")
        .if(body().isArray())
        .optional()
        .isString(),
    body("*.department", "department must be string")
        .if(body().isArray())
        .optional()
        .isString(),
    body("*.position", "position must be string")
        .if(body().isArray())
        .optional()
        .isString(),
    handleValidation,
];
