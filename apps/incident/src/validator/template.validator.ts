import { handleValidation } from "app";
import { RequestHandler } from "express";
import { body, ValidationChain } from "express-validator";

export const createTemplateValidator = (): (
    | ValidationChain
    | RequestHandler
)[] => [
    body("name", "name must be string").isString().optional(),
    body("description", "name must be string").isString().optional(),
    body("tenant", "description must be string").optional().isString(),
    handleValidation,
];
