import { handleValidation } from "app";
import { RequestHandler } from "express";
import { body, query, ValidationChain } from "express-validator";
import { notString } from "utils";

export const findGroupValidator = (): (ValidationChain | RequestHandler)[] => [
    query("query", "query must be string").optional().isString(),
    query("sort", "sort must be string").optional().isString(),
    query("size").replace([null, undefined], 10),
    query("page").replace([null, undefined], 0),

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

    handleValidation,
];

export const createGroupValidator = (): (
    | ValidationChain
    | RequestHandler
)[] => [
    body("name", "name must be string and less than 250")
        .isString()
        .isLength({ min: 0, max: 250 })
        .bail()
        .notEmpty(),
    body("description", "description must be string").optional().isString(),
    body("leader_id", "leader id must be string").optional().isString(),
    body("members").replace([null, undefined], []),
    body("members", "members must be array of string")
        .isArray()
        .bail()
        .custom((i) => !i.some(notString)),
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

export const updateGroupValidator = (): (
    | ValidationChain
    | RequestHandler
)[] => [
    body("name", "name must be string and less than 250")
        .optional()
        .isString()
        .isLength({ min: 0, max: 250 })
        .bail()
        .notEmpty(),
    body("description", "description must be string").optional().isString(),
    body("leader_id", "leader must be string").optional().isString(),
    body("members").replace([null, undefined], []),
    body("members", "members must be array of string")
        .if(body("members").isArray())
        .custom((i) => !i.some(notString)),
    handleValidation,
];
