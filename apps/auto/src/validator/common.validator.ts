import { handleValidation } from "app";
import { RequestHandler } from "express";
import { ValidationChain, query } from "express-validator";

export const findValidator = (): (ValidationChain | RequestHandler)[] => [
    query("query", "query must be string").optional().isString(),
    query("sort", "sort must be string").optional().isString(),
    query("size").replace([null, undefined], 10),
    query("type", `type must be in ["REQUEST", "INCIDENT"]`).isIn([
        "INCIDENT",
        "REQUEST",
    ]),
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
