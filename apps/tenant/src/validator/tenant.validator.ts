import { handleValidation } from "app";
import { RequestHandler } from "express";
import { body, query, ValidationChain } from "express-validator";
import { notString } from "utils";

export const getTenantByValidator = (): (
    | ValidationChain
    | RequestHandler
)[] => [
    query("type").replace([null, undefined, ""], "id"),
    query("type", "type must be id or code").isIn(["id", "code"]),
    handleValidation,
];

export const createTenantValidator = (): (
    | ValidationChain
    | RequestHandler
)[] => [
    body("code", "code must not be empty and length less than 51 characters")
        .exists()
        .bail()
        .notEmpty()
        .isLength({ max: 50 }),
    body("name", "the length of name must less than 101 characters").isLength({
        max: 100,
    }),
    body("phone", "the phone number is not in the correct format").custom(
        (p) => {
            if (!p) {
                return true;
            }
            const regex =
                /^(0)(3[2-9]|5[6|8|9]|7[0|6-9]|8[0-6|8|9]|9[0-4|6-9])[0-9]{7}$/;
            return regex.test(p);
        }
    ),
    body("email", "the email is not in the correct format").custom((p) => {
        if (!p) {
            return true;
        }
        const regex =
            /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        return regex.test(p);
    }),
    body("description", "description must be string").optional().isString(),
    body("address", "address must be string").optional().isString(),
    body("is_active").replace([null, undefined], true),
    body("is_active", "is_active must boolean").exists().bail().isBoolean(),
    handleValidation,
];

export const updateTenantValidator = (): (
    | ValidationChain
    | RequestHandler
)[] => [
    query("type").replace([null, undefined, ""], "id"),
    query("type", "type must be id or code").isIn(["id", "code"]),
    body("name", "name must be string").optional().isString(),
    body("description", "description must be string").optional().isString(),
    body("is_active", "is_active must be boolean").optional().isBoolean(),
    body("address", "address must be string").optional().isString(),
    body("email").optional(),
    body("phone").optional(),
    handleValidation,
];

export const findTenantValidator = (): (ValidationChain | RequestHandler)[] => [
    query("size").replace([null, undefined], 10),
    query("page").replace([null, undefined], 0),
    query("query", "query must be string").optional().isString(),
    query("sort", "sort must be string").optional().isString(),
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

export const getTenantByCodesValidator = (): (
    | ValidationChain
    | RequestHandler
)[] => [
    body("codes", "codes must be array of string")
        .notEmpty()
        .bail()
        .isArray()
        .bail()
        .custom((id) => !id.some(notString)),
    handleValidation,
];

export const increaseUserValidator = (): (
    | ValidationChain
    | RequestHandler
)[] => [
    body("data.*.tenant", "tenant must not be empty")
        .exists()
        .bail()
        .notEmpty(),
    body("data.*.amount", "amount must be integer an greater than 0").isInt({
        min: 1,
    }),
    handleValidation,
];

export const updateActivationValidator = (): (
    | ValidationChain
    | RequestHandler
)[] => [
    body("status", "status must boolean").exists().bail().isBoolean(),
    body("codes", "codes must be array of string")
        .notEmpty()
        .bail()
        .isArray()
        .bail()
        .custom((id) => !id.some(notString)),
    handleValidation,
];
