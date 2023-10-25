import { handleValidation } from "app";
import { RequestHandler } from "express";
import { body, query, ValidationChain } from "express-validator";
import { findTenantValidator } from "./tenant.validator";

export { findTenantValidator as findServiceValidator };

export const createServiceValidator = (): (
    | ValidationChain
    | RequestHandler
)[] => [
    body("name", "name must be string and not empty")
        .isString()
        .bail()
        .notEmpty(),
    body(
        "type",
        "type must be string and be in ['BUSINESS_SERVICE', 'TECHNICAL_SERVICE']"
    ).isIn(["BUSINESS_SERVICE", "TECHNICAL_SERVICE"]),
    body("description", "description must be string and length less than 250")
        .optional()
        .isString()
        .isLength({ max: 250 }),
    body("time_process", "time process must be integer and greater than 0")
        .custom((value) => {
            if (value) {
                return Number.isInteger(Number(value)) && Number(value) > 0;
            }
            return true;
        })
        .optional(),
    body("time_support", "time support must be in ['8x5', '24x7']")
        .custom((value) => {
            if (value) {
                return ["8x5", "24x7"].includes(value);
            }
            return true;
        })
        .optional(),
    body("manager", "manager must be string").optional().isString(),
    body("department", "department must be string and not be empty")
        .isString()
        .bail()
        .optional(),
    body("is_active").replace([null, undefined], true),
    body("is_active", "is_active must boolean").exists().bail().isBoolean(),
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

/**
 * It validates the request body of a PUT request to the /services/:id endpoint
 */
export const updateServiceValidator = (): (
    | ValidationChain
    | RequestHandler
)[] => [
    body("name", "name must be string").optional().isString().bail(),
    body(
        "type",
        "type must be string and be in ['BUSINESS_SERVICE', 'TECHNICAL_SERVICE']"
    )
        .optional()
        .isIn(["BUSINESS_SERVICE", "TECHNICAL_SERVICE"]),
    body("description", "description must be string").optional().isString(),
    body("time_process", "time process must be integer and greater than 0")
        .custom((value) => {
            if (value) {
                return Number.isInteger(Number(value)) && Number(value) > 0;
            }
            return true;
        })
        .optional(),
    body("time_support", "time support must be in ['8x5', '24x7']")
        .custom((value) => {
            if (value) {
                return ["8x5", "24x7"].includes(value);
            }
            return true;
        })
        .optional(),
    body("manager", "manager must be string").optional().isString(),
    body("department", "department must be string")
        .optional()
        .isString()
        .bail(),
    body("is_active", "is_active must boolean").optional().isBoolean(),
    handleValidation,
];

export const createSubServiceValidator = (): (
    | ValidationChain
    | RequestHandler
)[] => [
    body("name", "name must be string and not empty")
        .isString()
        .bail()
        .notEmpty(),
    handleValidation,
];

export const createManySubServiceValidator = (): (
    | ValidationChain
    | RequestHandler
)[] => [
    body("names", "names must be array of string and not empty")
        .isArray({ min: 1 })
        .bail()
        .notEmpty()
        .bail()
        .custom((value) => {
            return value.every((item: unknown) => typeof item === "string");
        }),
    handleValidation,
];

export const updateSubServiceValidator = (): (
    | ValidationChain
    | RequestHandler
)[] => [
    body("name", "name must be string").optional().isString().bail(),
    body("description", "description must be string").optional().isString(),
    handleValidation,
];
