import { handleValidation } from "app";
import { RequestHandler } from "express";
import { ValidationChain, body, query } from "express-validator";

export const updateAutoPriorityValidator = (): (
    | ValidationChain
    | RequestHandler
)[] => [
    body().isArray().withMessage("body must be array object"),
    body("[*]id", "auto id must be string and not empty")
        .if(body().isArray())
        .isString()
        .bail()
        .notEmpty(),
    query("type", `type must be in ["REQUEST", "INCIDENT"]`).isIn([
            "INCIDENT",
            "REQUEST",
        ]),
    body("[*]priority", "priority must be number and greater than 0")
        .if(body().isArray())
        .isInt({ min: 1 }),
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
