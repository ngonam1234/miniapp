import { handleValidation } from "app";
import { RequestHandler } from "express";
import { ValidationChain, query } from "express-validator";

export const getFieldDataValidator = (): (
    | ValidationChain
    | RequestHandler
)[] => [
    query("field", "field must be string and not be empty")
        .isString()
        .bail()
        .notEmpty(),
    query("type", `type must be in ["REQUEST", "INCIDENT"]`).isIn([
        "INCIDENT",
        "REQUEST",
    ]),
    query("group", "group must be string and not be empty")
        .optional()
        .isString()
        .bail()
        .notEmpty(),
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
