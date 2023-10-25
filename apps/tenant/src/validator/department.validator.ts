import { handleValidation } from "app";
import { RequestHandler } from "express";
import { body, ValidationChain, query } from "express-validator";
import { notString } from "utils";

export const findDepartmentByIdsValidator = (): (
    | ValidationChain
    | RequestHandler
)[] => [
    body("ids", "ids must be array of string")
        .notEmpty()
        .bail()
        .isArray()
        .bail()
        .custom((id) => !id.some(notString)),
    handleValidation,
];

export const createDepartmentValidator = (): (
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
    query("tenant", "tenant must be string and not empty")
        .isString()
        .bail()
        .notEmpty(),
    body("name", "name must be string and not empty")
        .isString()
        .bail()
        .notEmpty()
        .isLength({ max: 50 })
        .trim(),
    body("description", "description must be string and length less than 250")
        .optional()
        .isString()
        .isLength({ max: 250 })
        .trim(),
    // TODO
    body("manager").optional(),
    body("approver").optional(),
    body("members").optional(),
    body("pic").optional(),
    body("sub_departments").optional(),
    body("is_active").optional(),

    handleValidation,
];
export const importDepartmentValidator = (): (
    | ValidationChain
    | RequestHandler
)[] => [
    body().isArray().withMessage("body must be array of department"),
    query("*.tenant").customSanitizer((value, { req }) => {
        if (!req.payload.roles.includes("SA")) {
            return req.payload.tenant;
        } else {
            return value;
        }
    }),
    query("*.tenant", "tenant must be string and not empty")
        .isString()
        .bail()
        .notEmpty(),
    body("*.name", "name must be string and not empty")
        .if(body().isArray())
        .isString()
        .bail()
        .notEmpty()
        .isLength({ max: 50 })
        .trim(),
    body("*.description", "description must be string and length less than 250")
        .if(body().isArray())
        .optional()
        .isString()
        .isLength({ max: 250 })
        .trim(),
    // TODO
    body("*.manager").optional().if(body().isArray()),
    body("*.approver").optional().if(body().isArray()),
    body("*.members").optional().if(body().isArray()),
    body("*.pic").optional().if(body().isArray()),
    body("*.sub_departments").optional().if(body().isArray()),
    body("*.is_active").optional().if(body().isArray()),

    handleValidation,
];

export const deleteDepartmentValidator = (): (
    | ValidationChain
    | RequestHandler
)[] => [
    body("department_ids", "name must be string and not empty")
        .isArray()
        .custom((i) => !i.some(notString)),

    handleValidation,
];

export const updateDepartmentValidator = (): (
    | ValidationChain
    | RequestHandler
)[] => [
    // TODO
    body("name").optional(),
    body("tenant").optional(),
    body("sub_departments").optional(),
    body("members").optional(),

    body("description", "description must be string")
        .optional()
        .isString()
        .isLength({ max: 250 })
        .trim(),
    body("manager", "manager must be string").optional().isString(),
    body("approver", "approver must be string").optional().isString(),
    body("pic", "pic must be string").optional().isString(),
    body("is_active").replace([null, undefined], true),
    body("is_active", "is_active must boolean").exists().bail().isBoolean(),
    handleValidation,
];
export const findDepartmentValidator = (): (
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
    query("query", "query must be string").optional().isString(),
    query("sort", "sort must be string").optional().isString(),
    query("size").replace([null, undefined], 10),
    query("page").replace([null, undefined], 0),
    query("size", "size must be integer and in [1:50] or equal -1")
        .isInt({ min: -1, max: 50 })
        .custom((v) => v != 0),
    query("page", "page must be integer and greater than -1").isInt({ min: 0 }),
    handleValidation,
];
