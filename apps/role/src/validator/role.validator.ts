import { handleValidation } from "app";
import { RequestHandler } from "express";
import { body, query, ValidationChain } from "express-validator";

export const findValidator = (): (ValidationChain | RequestHandler)[] => [
    query("query", "query must be string").optional().isString(),
    query("sort", "sort must be string").optional().isString(),
    query("size").replace([null, undefined], 10),
    query("page").replace([null, undefined], 0),
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

export const getAllDataValidator = (): (ValidationChain | RequestHandler)[] => [
    query("tenant", "tenant must be string").isString().bail().optional(),
    query("is_active", "is_active must be boolean")
        .isBoolean()
        .bail()
        .optional(),
    handleValidation,
];

export const createEmployeeValidator = (): (
    | ValidationChain
    | RequestHandler
)[] => [
    body("name", "name must be string").isString().bail().exists(),
    body("description", "description must be string")
        .isString()
        .bail()
        .optional(),
    body("is_active", "is_active must be boolean")
        .isBoolean()
        .bail()
        .optional(),
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
        
    // request_permission
    body("request_permission", "request_permission must be object")
        .isObject()
        .bail()
        .optional(),
    body("request_permission.view", "request_permission.view must be boolean")
        .isBoolean()
        .bail()
        .optional(),
    body("request_permission.add", "request_permission.add must be boolean")
        .isBoolean()
        .bail()
        .optional(),
    body("request_permission.edit", "request_permission.update must be boolean")
        .isBoolean()
        .bail()
        .optional(),
    body(
        "request_permission.edit_priority",
        "request_permission.edit_priority must be boolean"
    )
        .isBoolean()
        .bail()
        .optional(),
    body(
        "request_permission.edit_impact",
        "request_permission.edit_impact must be boolean"
    )
        .isBoolean()
        .bail()
        .optional(),
    body(
        "request_permission.edit_urgency",
        "request_permission.edit_urgency must be boolean"
    )
        .isBoolean()
        .bail()
        .optional(),
    body(
        "request_permission.edit_due_date",
        "request_permission.edit_due_date must be boolean"
    )
        .isBoolean()
        .bail()
        .optional(),
    body(
        "request_permission.edit_due_date_SLA",
        "request_permission.edit_due_date_SLA must be boolean"
    )
        .isBoolean()
        .bail()
        .optional(),
    body(
        "request_permission.edit_requester",
        "request_permission.edit_requester must be boolean"
    )
        .isBoolean()
        .bail()
        .optional(),
    body(
        "request_permission.change_status_to_resolved",
        "request_permission.change_status_to_resolved must be boolean"
    )
        .isBoolean()
        .bail()
        .optional(),
    body(
        "request_permission.change_status_to_closed",
        "request_permission.change_status_to_closed must be boolean"
    )
        .isBoolean()
        .bail()
        .optional(),
    body(
        "request_permission.change_status_to_cancelled",
        "request_permission.change_status_to_cancelled must be boolean"
    )
        .isBoolean()
        .bail()
        .optional(),

    // incident_permission
    body("incident_permission", "incident_permission must be object")
        .isObject()
        .bail()
        .optional(),
    body("incident_permission.view", "incident_permission.view must be boolean")
        .isBoolean()
        .bail()
        .optional(),
    body("incident_permission.add", "incident_permission.add must be boolean")
        .isBoolean()
        .bail()
        .optional(),
    body(
        "incident_permission.edit",
        "incident_permission.update must be boolean"
    )
        .isBoolean()
        .bail()
        .optional(),
    body(
        "incident_permission.edit_priority",
        "incident_permission.edit_priority must be boolean"
    )
        .isBoolean()
        .bail()
        .optional(),
    body(
        "incident_permission.edit_impact",
        "incident_permission.edit_impact must be boolean"
    )
        .isBoolean()
        .bail()
        .optional(),
    body(
        "incident_permission.edit_urgency",
        "incident_permission.edit_urgency must be boolean"
    )
        .isBoolean()
        .bail()
        .optional(),
    body(
        "incident_permission.edit_due_date",
        "incident_permission.edit_due_date must be boolean"
    )
        .isBoolean()
        .bail()
        .optional(),
    body(
        "incident_permission.edit_due_date_SLA",
        "incident_permission.edit_due_date_SLA must be boolean"
    )
        .isBoolean()
        .bail()
        .optional(),
    body(
        "incident_permission.edit_requester",
        "incident_permission.edit_requester must be boolean"
    )
        .isBoolean()
        .bail()
        .optional(),
    body(
        "incident_permission.change_status_to_resolved",
        "incident_permission.change_status_to_resolved must be boolean"
    )
        .isBoolean()
        .bail()
        .optional(),
    body(
        "incident_permission.change_status_to_closed",
        "incident_permission.change_status_to_closed must be boolean"
    )
        .isBoolean()
        .bail()
        .optional(),
    body(
        "incident_permission.change_status_to_cancelled",
        "incident_permission.change_status_to_cancelled must be boolean"
    )
        .isBoolean()
        .bail()
        .optional(),

    // solution_permission
    body("solution_permission", "solution_permission must be object")
        .isObject()
        .bail()
        .optional(),
    body("solution_permission.view", "solution_permission.view must be boolean")
        .isBoolean()
        .bail()
        .optional(),
    body("solution_permission.add", "solution_permission.add must be boolean")
        .isBoolean()
        .bail()
        .optional(),
    body(
        "solution_permission.edit",
        "solution_permission.update must be boolean"
    )
        .isBoolean()
        .bail()
        .optional(),
    body(
        "solution_permission.approve",
        "solution_permission.approve must be boolean"
    )
        .isBoolean()
        .bail()
        .optional(),

    // advanced_view_permission
    body("advanced_view_permission", "advanced_view_permission must be object")
        .isObject()
        .bail()
        .optional(),
    body(
        "advanced_view_permission.all_ticket",
        "advanced_view_permission.all_ticket must be boolean"
    )
        .isBoolean()
        .bail()
        .optional(),
    body(
        "advanced_view_permission.group_ticket",
        "advanced_view_permission.group_ticket must be boolean"
    )
        .isBoolean()
        .bail()
        .optional(),
    body(
        "advanced_view_permission.technician_ticket",
        "advanced_view_permission.technician_ticket must be boolean"
    )
        .isBoolean()
        .bail()
        .optional(),

    // task_permission
    body("task_permission", "task_permission must be object")
        .isObject()
        .bail()
        .optional(),
    body("task_permission.add", "task_permission.add must be boolean")
        .isBoolean()
        .bail()
        .optional(),
    body("task_permission.edit", "task_permission.update must be boolean")
        .isBoolean()
        .bail()
        .optional(),
    body("task_permission.approve", "task_permission.approve must be boolean")
        .isBoolean()
        .bail()
        .optional(),
    handleValidation,
];

export const createCustomerValidator = (): (
    | ValidationChain
    | RequestHandler
)[] => [
    body("name", "name must be string").isString().bail().exists(),
    body("description", "description must be string")
        .isString()
        .bail()
        .optional(),
    body("is_active", "is_active must be boolean")
        .isBoolean()
        .bail()
        .optional(),
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

    // request_permission
    body("request_permission", "request_permission must be object")
        .isObject()
        .bail()
        .optional(),
    body("request_permission.view", "request_permission.view must be boolean")
        .isBoolean()
        .bail()
        .optional(),
    body(
        "request_permission.view_only_requester",
        "request_permission.view_only_requester must be boolean"
    )
        .isBoolean()
        .bail()
        .optional(),
    body("request_permission.add", "request_permission.add must be boolean")
        .isBoolean()
        .bail()
        .optional(),
    body(
        "request_permission.approve",
        "request_permission.approve must be boolean"
    )
        .isBoolean()
        .bail()
        .optional(),

    // incident_permission
    body("incident_permission", "incident_permission must be object")
        .isObject()
        .bail()
        .optional(),
    body("incident_permission.view", "incident_permission.view must be boolean")
        .isBoolean()
        .bail()
        .optional(),
    body(
        "incident_permission.view_only_requester",
        "incident_permission.view_only_requester must be boolean"
    )
        .isBoolean()
        .bail()
        .optional(),
    body("incident_permission.add", "incident_permission.add must be boolean")
        .isBoolean()
        .bail()
        .optional(),
    body(
        "incident_permission.approve",
        "incident_permission.approve must be boolean"
    )
        .isBoolean()
        .bail()
        .optional(),

    // solution_permission
    body("solution_permission", "solution_permission must be object")
        .isObject()
        .bail()
        .optional(),
    body("solution_permission.view", "solution_permission.view must be boolean")
        .isBoolean()
        .bail()
        .optional(),
    handleValidation,
];

export const updateEmployeeValidator = (): (
    | ValidationChain
    | RequestHandler
)[] => [
    body("name", "name must be string").isString().bail().optional(),
    body("description", "description must be string")
        .isString()
        .bail()
        .optional(),
    body("is_active", "is_active must be boolean").isBoolean().optional(),

    // request_permission
    body("request_permission", "request_permission must be object")
        .isObject()
        .bail()
        .optional(),
    body("request_permission.view", "request_permission.view must be boolean")
        .isBoolean()
        .bail()
        .optional(),
    body("request_permission.add", "request_permission.add must be boolean")
        .isBoolean()
        .bail()
        .optional(),
    body("request_permission.edit", "request_permission.update must be boolean")
        .isBoolean()
        .bail()
        .optional(),
    body(
        "request_permission.edit_priority",
        "request_permission.edit_priority must be boolean"
    )
        .isBoolean()
        .bail()
        .optional(),
    body(
        "request_permission.edit_impact",
        "request_permission.edit_impact must be boolean"
    )
        .isBoolean()
        .bail()
        .optional(),
    body(
        "request_permission.edit_urgency",
        "request_permission.edit_urgency must be boolean"
    )
        .isBoolean()
        .bail()
        .optional(),
    body(
        "request_permission.edit_due_date",
        "request_permission.edit_due_date must be boolean"
    )
        .isBoolean()
        .bail()
        .optional(),
    body(
        "request_permission.edit_due_date_SLA",
        "request_permission.edit_due_date_SLA must be boolean"
    )
        .isBoolean()
        .bail()
        .optional(),
    body(
        "request_permission.edit_requester",
        "request_permission.edit_requester must be boolean"
    )
        .isBoolean()
        .bail()
        .optional(),
    body(
        "request_permission.change_status_to_resolved",
        "request_permission.change_status_to_resolved must be boolean"
    )
        .isBoolean()
        .bail()
        .optional(),
    body(
        "request_permission.change_status_to_closed",
        "request_permission.change_status_to_closed must be boolean"
    )
        .isBoolean()
        .bail()
        .optional(),
    body(
        "request_permission.change_status_to_cancelled",
        "request_permission.change_status_to_cancelled must be boolean"
    )
        .isBoolean()
        .bail()
        .optional(),

    // incident_permission
    body("incident_permission", "incident_permission must be object")
        .isObject()
        .bail()
        .optional(),
    body("incident_permission.view", "incident_permission.view must be boolean")
        .isBoolean()
        .bail()
        .optional(),
    body("incident_permission.add", "incident_permission.add must be boolean")
        .isBoolean()
        .bail()
        .optional(),
    body(
        "incident_permission.edit",
        "incident_permission.update must be boolean"
    )
        .isBoolean()
        .bail()
        .optional(),
    body(
        "incident_permission.edit_priority",
        "incident_permission.edit_priority must be boolean"
    )
        .isBoolean()
        .bail()
        .optional(),
    body(
        "incident_permission.edit_impact",
        "incident_permission.edit_impact must be boolean"
    )
        .isBoolean()
        .bail()
        .optional(),
    body(
        "incident_permission.edit_urgency",
        "incident_permission.edit_urgency must be boolean"
    )
        .isBoolean()
        .bail()
        .optional(),
    body(
        "incident_permission.edit_due_date",
        "incident_permission.edit_due_date must be boolean"
    )
        .isBoolean()
        .bail()
        .optional(),
    body(
        "incident_permission.edit_due_date_SLA",
        "incident_permission.edit_due_date_SLA must be boolean"
    )
        .isBoolean()
        .bail()
        .optional(),
    body(
        "incident_permission.edit_requester",
        "incident_permission.edit_requester must be boolean"
    )
        .isBoolean()
        .bail()
        .optional(),
    body(
        "incident_permission.change_status_to_resolved",
        "incident_permission.change_status_to_resolved must be boolean"
    )
        .isBoolean()
        .bail()
        .optional(),
    body(
        "incident_permission.change_status_to_closed",
        "incident_permission.change_status_to_closed must be boolean"
    )
        .isBoolean()
        .bail()
        .optional(),
    body(
        "incident_permission.change_status_to_cancelled",
        "incident_permission.change_status_to_cancelled must be boolean"
    )
        .isBoolean()
        .bail()
        .optional(),

    // solution_permission
    body("solution_permission", "solution_permission must be object")
        .isObject()
        .bail()
        .optional(),
    body("solution_permission.view", "solution_permission.view must be boolean")
        .isBoolean()
        .bail()
        .optional(),
    body("solution_permission.add", "solution_permission.add must be boolean")
        .isBoolean()
        .bail()
        .optional(),
    body(
        "solution_permission.edit",
        "solution_permission.update must be boolean"
    )
        .isBoolean()
        .bail()
        .optional(),
    body(
        "solution_permission.approve",
        "solution_permission.approve must be boolean"
    )
        .isBoolean()
        .bail()
        .optional(),

    // advanced_view_permission
    body("advanced_view_permission", "advanced_view_permission must be object")
        .isObject()
        .bail()
        .optional(),
    body(
        "advanced_view_permission.all_ticket",
        "advanced_view_permission.all_ticket must be boolean"
    )
        .isBoolean()
        .bail()
        .optional(),
    body(
        "advanced_view_permission.group_ticket",
        "advanced_view_permission.group_ticket must be boolean"
    )
        .isBoolean()
        .bail()
        .optional(),
    body(
        "advanced_view_permission.technician_ticket",
        "advanced_view_permission.technician_ticket must be boolean"
    )
        .isBoolean()
        .bail()
        .optional(),

    // task_permission
    body("task_permission", "task_permission must be object")
        .isObject()
        .bail()
        .optional(),
    body("task_permission.add", "task_permission.add must be boolean")
        .isBoolean()
        .bail()
        .optional(),
    body("task_permission.edit", "task_permission.update must be boolean")
        .isBoolean()
        .bail()
        .optional(),
    body("task_permission.approve", "task_permission.approve must be boolean")
        .isBoolean()
        .bail()
        .optional(),
    handleValidation,
];

export const updateCustomerValidator = (): (
    | ValidationChain
    | RequestHandler
)[] => [
        body("name", "name must be string").isString().bail().optional(),
        body("description", "description must be string")
            .isString()
            .bail()
            .optional(),
        body("is_active", "is_active must be boolean").isBoolean().optional(),

    // request_permission
    body("request_permission", "request_permission must be object")
        .isObject()
        .bail()
        .optional(),
    body("request_permission.view", "request_permission.view must be boolean")
        .isBoolean()
        .bail()
        .optional(),
    body(
        "request_permission.view_only_requester",
        "request_permission.view_only_requester must be boolean"
    )
        .isBoolean()
        .bail()
        .optional(),
    body("request_permission.add", "request_permission.add must be boolean")
        .isBoolean()
        .bail()
        .optional(),
    body(
        "request_permission.approve",
        "request_permission.approve must be boolean"
    )
        .isBoolean()
        .bail()
        .optional(),

    // incident_permission
    body("incident_permission", "incident_permission must be object")
        .isObject()
        .bail()
        .optional(),
    body("incident_permission.view", "incident_permission.view must be boolean")
        .isBoolean()
        .bail()
        .optional(),
    body(
        "incident_permission.view_only_requester",
        "incident_permission.view_only_requester must be boolean"
    )
        .isBoolean()
        .bail()
        .optional(),
    body("incident_permission.add", "incident_permission.add must be boolean")
        .isBoolean()
        .bail()
        .optional(),
    body(
        "incident_permission.approve",
        "incident_permission.approve must be boolean"
    )
        .isBoolean()
        .bail()
        .optional(),

    // solution_permission
    body("solution_permission", "solution_permission must be object")
        .isObject()
        .bail()
        .optional(),
    body("solution_permission.view", "solution_permission.view must be boolean")
        .isBoolean()
        .bail()
        .optional(),
    handleValidation,
];

export const deleteManyValidator = (): (ValidationChain | RequestHandler)[] => [
    body("roleIds", "roleIds must be array").isArray(),
    handleValidation,
];
