import { handleValidation } from "app";
import { RequestHandler } from "express";
import { ValidationChain, body, query } from "express-validator";

export const createPriorityMatrixValidator = (): (
    | ValidationChain
    | RequestHandler
)[] => [
    body("urgency", "urgency must be string and not empty")
        .isString()
        .bail()
        .notEmpty(),
    body("priority", "priority must be string and not empty")
        .isString()
        .bail()
        .notEmpty(),
    body("impact", "impact must be string and not empty")
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
    handleValidation,
];

export const getPriorityMatrixValidator = (): (
    | ValidationChain
    | RequestHandler
)[] => [
    query("tenant").customSanitizer((value, { req }) => {
        if (!req.payload.roles.includes("SA")) {
            return req.payload.tenant;
        } else {
            return value;
        }
    }),
    handleValidation,
];

export const deletePriorityMatrixValidator = (): (
    | ValidationChain
    | RequestHandler
)[] => [
    body("urgency", "urgency must be string and not empty")
        .isString()
        .bail()
        .notEmpty(),
    body("priority", "priority must be string and not empty")
        .isString()
        .bail()
        .notEmpty(),
    body("impact", "impact must be string and not empty")
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
    handleValidation,
];
