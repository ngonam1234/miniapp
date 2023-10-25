import { handleValidation } from "app";
import { RequestHandler } from "express";
import { ValidationChain, body, query } from "express-validator";

export const createConnectValidator = (): (
    | ValidationChain
    | RequestHandler
)[] => [
    body("requests").isArray().optional(),
    body("incidents").isArray().optional(),
    body().custom((value, { req }) => {
        const array = [];
        req.body.requests ? array.push(...(req.body.requests as string[])) : "";
        req.body.incidents
            ? array.push(...(req.body.incidents as string[]))
            : "";

        if (array.length < 2) {
            throw new Error("Số ticket tạo liên kết phải lớn hơn bằng 2");
        }
        return true;
    }),
    handleValidation,
];
export const findConnectValidator = (): (
    | ValidationChain
    | RequestHandler
)[] => [
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
    query("type", "query must be string").isString(),
    handleValidation,
];
