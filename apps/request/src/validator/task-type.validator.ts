import { handleValidation } from "app";
import { RequestHandler } from "express";
import { ValidationChain, body } from "express-validator";

export const updateTaskTypeValidator = (): (
    | ValidationChain
    | RequestHandler
)[] => [
    body("name", "name must be string and not empty")
        .optional()
        .isString()
        .isLength({ max: 50 })
        .bail()
        .notEmpty()
        .trim(),
    body("description", "description must be string and length less than 250")
        .optional()
        .isString()
        .isLength({ max: 250 })
        .trim(),
    body("is_active", "is_active must be boolean").optional().isBoolean(),
    handleValidation,
];
