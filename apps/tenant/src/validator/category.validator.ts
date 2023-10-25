import { handleValidation } from "app";
import { RequestHandler } from "express";
import { body, ValidationChain } from "express-validator";
import { findTenantValidator } from "./tenant.validator";

export { findTenantValidator as findCategoryValidator };

export const createCategoryValidator = (): (
    | ValidationChain
    | RequestHandler
)[] => [
    body("name", "name must be string and not empty")
        .isString()
        .bail()
        .notEmpty(),
    body("service", "service must be string and not empty")
        .isString()
        .bail()
        .notEmpty(),
    body("description", "description must be string").optional().isString(),
    body("technician", "technician must be string").optional().isString(),
    handleValidation,
];

export const updateCategoryValidator = (): (
    | ValidationChain
    | RequestHandler
)[] => [
    body("name", "name must be string").optional().isString(),
    body("description", "description must be string").optional().isString(),
    body("description", "description must be string").optional().isString(),
    body("technician", "technician must be string").optional().isString(),
    handleValidation,
];

export const createSubCategoryValidator = (): (
    | ValidationChain
    | RequestHandler
)[] => [
    body("name", "name must be string and not empty")
        .isString()
        .bail()
        .notEmpty(),
    body("description", "description must be string").optional().isString(),
    handleValidation,
];

export const updateSubCategoryValidator = (): (
    | ValidationChain
    | RequestHandler
)[] => [
    body("name", "name must be string").optional().isString(),
    body("description", "description must be string").optional().isString(),
    handleValidation,
];
