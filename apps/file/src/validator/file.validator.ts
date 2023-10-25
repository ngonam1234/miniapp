import { handleValidation } from "app";
import { RequestHandler } from "express";
import { body, query, ValidationChain } from "express-validator";
import { notString } from "utils";

export const createLinkValidator = (): (ValidationChain | RequestHandler)[] => [
    query("type", "type must be string").exists().bail().notEmpty(),
    handleValidation,
];

export const getLinkValidator = (): (ValidationChain | RequestHandler)[] => [
    body(undefined, "body must be array of file name")
        .isArray()
        .bail()
        .custom((v) => !v.some(notString)),
    handleValidation,
];
