/* eslint-disable no-empty-pattern */
import { handleValidation } from "app";
import { RequestHandler } from "express";
import { body, param, query, ValidationChain } from "express-validator";
import { notString } from "utils";

export const findTaskValidator = (): (ValidationChain | RequestHandler)[] => [
    query("query", "query must be string").optional().isString(),
    query("sort", "sort must be string").optional().isString(),
    query("size").replace([null, undefined], 10),
    query("page").replace([null, undefined], 0),
    query("size", "size must be integer and in [1:50]").isInt({
        min: 1,
        max: 50,
    }),
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

export const deleletManyTasksValidator = (): (
    | ValidationChain
    | RequestHandler
)[] => [
    body("task_ids").replace([null, undefined], []),
    body("task_ids", "task_ids must be array of string").optional().isArray(),
    handleValidation,
];

export const doApprovalTaskValidator = (): (
    | ValidationChain
    | RequestHandler
)[] => [
    body("approval_status", "approval_status must be string and not empty")
        .isString()
        .bail()
        .notEmpty(),
    body("comment", "comment must be string and length less than 250")
        .optional()
        .isString()
        .isLength({ max: 250 })
        .trim(),
    handleValidation,
];

export const doApprovalManyTaskValidator = (): (
    | ValidationChain
    | RequestHandler
)[] => [
    body("task_ids", "task_ids must be array of string")
        .isArray()
        .bail()
        .custom((id) => !id.some(notString)),
    body(
        "approval_status",
        "approval_status must be in REJECT or APPROVED and not empty"
    )
        .isIn(["REJECT", "APPROVED"])
        .notEmpty(),
    handleValidation,
];

export const createTaskValidator = (): (ValidationChain | RequestHandler)[] => [
    body("name", "Name must be string and not empty and length less than 250")
        .isString()
        .isLength({ max: 250 })
        .bail()
        .notEmpty()
        .trim(),
    body("description", "description must be string")
        .optional()
        .isString()
        .trim(),
    param("ticketId", "Ticket ID is required").notEmpty().isString(),
    body("type").optional().isString(),
    body("group", "Group ID is required").notEmpty().bail().isString(),
    body("approver", "approver must be string").optional().isString(),
    body("technician", "Technician ID is required")
        .notEmpty()
        .bail()
        .isString(),
    body(
        "status",
        "status must be in [UNHANDLED, HANDLING, FINISHED] and not empty"
    )
        .isIn(["UNHANDLED", "HANDLING", "FINISHED"])
        .optional(),
    body("handling_time", "handling_time must be in [8x5, 24x5, 24x24]")
        .isIn(["8x5", "24x5", "24x24"])
        .optional(),
    body("estimated_time.begin", "estimated_time.begin is not empty")
        .notEmpty()
        .custom((value, {}) => {
            const beginTime = new Date(value);
            if (isNaN(beginTime.getTime()) && value !== "") {
                throw new Error("Begin time must be a valid ISO 8601 date");
            }
            return true;
        }),
    body("estimated_time.end", "estimated_time.end is not empty")
        .notEmpty()
        .custom((value, { req }) => {
            const beginTime = req.body.estimated_time?.begin;
            const endTime = new Date(value);
            if (isNaN(endTime.getTime()) && value !== "") {
                throw new Error("End time must be a valid ISO 8601 date");
            }
            if (beginTime && endTime && value !== "" && beginTime > value) {
                throw new Error("End time must be greater than begin time");
            }
            return true;
        }),
    body("actual_time.begin")
        .optional()
        .custom((value, {}) => {
            const beginTime = new Date(value);
            if (isNaN(beginTime.getTime()) && value !== "") {
                throw new Error("Begin time must be a valid ISO 8601 date");
            }
            return true;
        }),
    body("actual_time.end")
        .optional()
        .custom((value, { req }) => {
            const beginTime = req.body.actual_time?.begin;
            const endTime = new Date(value);
            if (isNaN(endTime.getTime()) && value !== "") {
                throw new Error("End time must be a valid ISO 8601 date");
            }
            if (beginTime && endTime && value !== "" && beginTime > value) {
                throw new Error("End time must be greater than begin time");
            }
            return true;
        }),
    body("needed_approval", "needed_approval must be boolean")
        .optional()
        .isBoolean(),
    handleValidation,
];

export const updateTaskValidator = (): (ValidationChain | RequestHandler)[] => [
    body("name", "Name is required")
        .optional()
        .isLength({ max: 250 })
        .bail()
        .notEmpty()
        .trim(),
    body("type").optional().isString(),
    body("group", "Group ID is required").optional().notEmpty(),
    body("technician", "Technician ID is required").optional().notEmpty(),
    body("description", "description must be string")
        .optional()
        .isString()
        .trim(),
    body("status", "status must be in [UNHANDLED, HANDLING, FINISHED]")
        .isIn(["UNHANDLED", "HANDLING", "FINISHED"])
        .optional(),
    body("handling_time", "handling_time must be in [8x5, 24x5, 24x24]")
        .isIn(["8x5", "24x5", "24x24"])
        .optional(),
    body("estimated_time.begin")
        .optional()
        .notEmpty()
        .custom((value, {}) => {
            const beginTime = new Date(value);
            if (isNaN(beginTime.getTime()) && value !== "") {
                throw new Error("Begin time must be a valid ISO 8601 date");
            }
            return true;
        }),
    body("estimated_time.end")
        .optional()
        .notEmpty()
        .custom((value, { req }) => {
            const beginTime = req.body.estimated_time?.begin;
            const endTime = new Date(value);
            if (isNaN(endTime.getTime()) && value !== "") {
                throw new Error("End time must be a valid ISO 8601 date");
            }
            if (beginTime && endTime && value !== "" && beginTime > value) {
                throw new Error("End time must be greater than begin time");
            }
            return true;
        }),
    body("actual_time.begin")
        .optional()
        .custom((value, {}) => {
            const beginTime = new Date(value);
            if (isNaN(beginTime.getTime()) && value !== "") {
                throw new Error("Begin time must be a valid ISO 8601 date");
            }
            return true;
        }),
    body("actual_time.end")
        .optional()
        .custom((value, { req }) => {
            const beginTime = req.body.actual_time?.begin;
            const endTime = new Date(value);
            if (isNaN(endTime.getTime()) && value !== "") {
                throw new Error("End time must be a valid ISO 8601 date");
            }
            if (beginTime && endTime && value !== "" && beginTime > value) {
                throw new Error("End time must be greater than begin time");
            }
            return true;
        }),
    body("comment", "comment must be string and length less than 250")
        .optional()
        .isString()
        .trim(),
    body("added_worklog", "added_worklog must be boolean")
        .optional()
        .isBoolean(),
    body("needed_approval", "needed_approval must be boolean")
        .optional()
        .isBoolean(),
    handleValidation,
];
