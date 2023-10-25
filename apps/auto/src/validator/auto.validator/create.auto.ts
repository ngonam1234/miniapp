import { body, ValidationChain, query } from "express-validator";
import { RequestHandler } from "express";
import { handleValidation } from "app";
import { notString } from "utils";

export const createAutoValidator = (): (ValidationChain | RequestHandler)[] => [
    body("name", "name must be string")
        .isString()
        .isLength({ min: 1, max: 50 })
        .bail()
        .notEmpty(),
    // body("apply_request", "apply_request must be string").isString().bail().notEmpty().bail().isArray(),
    body("description", "description must be string")
        .optional()
        .isString()
        .isLength({ min: 0, max: 250 }),
    body("apply_request", `apply_request must be in ["CREATE", "EDIT"]`).isIn([
        "CREATE",
        "EDIT",
    ]),
    query("type", `type must be in ["REQUEST", "INCIDENT"]`).isIn([
        "INCIDENT",
        "REQUEST",
    ]),
    body(
        "auto_type",
        "auto_type value must be ROUND_ROBIN or LOAD_BALANCING"
    ).isIn(["ROUND_ROBIN", "LOAD_BALANCING"]),

    body(
        "apply_time.type",
        `apply_time.type must be in ALL_TIME or IN_WORK or OUT_WORK`
    ).isIn(["ALL_TIME", "IN_WORK", "OUT_WORK"]),

    body("apply_time.time", `apply_time.time must be in ["8x5","24x7","24x5"]`)
        .optional()
        .isIn(["8x5", "24x7", "24x5"]),
    body("group", "group must be string").isString(),
    body("apply_tech", "apply_tech must be object").notEmpty(),
    body(
        "apply_tech.type",
        "apply_tech.type must be in ALL or EXCEPT or ONLINE or ONLY"
    ).isIn(["ALL", "EXCEPT", "ONLINE", "ONLY"]),
    body("is_active", "is_active must be boolean").isBoolean(),
    // body("priority", "name must be number").isInt({min: 1, max: 100}).bail().notEmpty(),
    body("is_apply", "is_apply must be boolean").isBoolean(),
    body("conditions", "conditions must be array of objects")
        .if(matchingRuleExists)
        .isArray(),
    body("conditions.*.field", "conditions.*.field value must be string")
        .if(matchingConditionIsArray)
        .isString()
        .bail()
        .notEmpty(),
    body(
        "conditions.*.values",
        "conditions.*.values value must be array of string"
    )
        .if(matchingConditionIsArray)
        .isArray()
        .bail()
        .notEmpty()
        .bail()
        .custom((v) => !v.some(notString)),
    body("tenant").customSanitizer((value, { req }) => {
        if (!req.payload.roles.includes("SA")) {
            return req.payload.tenant;
        } else {
            return value;
        }
    }),
    body("tenant", "tenant must be string and not empty")
        .isString()
        .bail()
        .notEmpty(),
    handleValidation,
];

export const updateAutoValidator = (): (ValidationChain | RequestHandler)[] => [
    body("name", "name must be string")
        .optional()
        .isString()
        .isLength({ min: 1, max: 50 })
        .bail()
        .notEmpty(),
    query("type", `type must be in ["REQUEST", "INCIDENT"]`).isIn([
            "INCIDENT",
            "REQUEST",
        ]),
    // body("apply_request", "apply_request must be string").isString().bail().notEmpty().bail().isArray(),
    body("description", "description must be string")
        .optional()
        .isString()
        .isLength({ min: 0, max: 250 }),
    body("apply_request", `apply_request must be in ["CREATE", "EDIT"]`)
        .optional()
        .isIn(["CREATE", "EDIT"]),
    body("auto_type", "auto_type value must be ROUND_ROBIN or LOAD_BALANCING")
        .optional()
        .isIn(["ROUND_ROBIN", "LOAD_BALANCING"]),
    body("module", "module must be array")
        .optional()
        .isArray()
        .bail()
        .notEmpty(),
    body(
        "apply_time.type",
        `apply_time.type must be in ALL_TIME or IN_WORK or OUT_WORK`
    )
        .optional()
        .isIn(["ALL_TIME", "IN_WORK", "OUT_WORK"]),

    body("apply_time.time", `apply_time.time must be in ["8x5","24x7","24x5"]`)
        .optional()
        .isIn(["8x5", "24x7", "24x5"]),
    body("group", "group must be string").optional().isString(),
    body("apply_tech", "apply_tech must be object").optional().notEmpty(),
    body(
        "apply_tech.type",
        "apply_tech.type must be in ALL or EXCEPT or ONLINE or ONLY"
    )
        .optional()
        .isIn(["ALL", "EXCEPT", "ONLINE", "ONLY"]),
    body("is_active", "is_active must be boolean").optional().isBoolean(),
    // body("priority", "name must be number").optional().isInt({min: 1, max: 100}).bail().notEmpty(),
    body("is_apply", "is_apply must be boolean").optional().isBoolean(),
    body("conditions", "conditions must be array of objects")
        .optional()
        .if(matchingRuleExists)
        .isArray(),
    body("conditions.*.field", "conditions.*.field value must be string")
        .optional()
        .if(matchingConditionIsArray)
        .isString()
        .bail()
        .notEmpty(),
    body(
        "conditions.*.values",
        "conditions.*.values value must be array of string"
    )
        .optional()
        .if(matchingConditionIsArray)
        .optional()
        .isArray()
        .bail()
        .custom((v) => !v.some(notString)),
    body("tenant").customSanitizer((value, { req }) => {
        if (!req.payload.roles.includes("SA")) {
            return req.payload.tenant;
        } else {
            return value;
        }
    }),
    body("tenant", "tenant must be string and not empty")
        .optional()
        .isString()
        .bail()
        .notEmpty(),
    handleValidation,
];

const matchingRuleExists = body("conditions").exists();
const matchingConditionIsArray = body("conditions").isArray();
