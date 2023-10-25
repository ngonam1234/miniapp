import { query, ValidationChain } from "express-validator";
import { handleValidation } from "app";
import { RequestHandler } from "express";

export const getIdentityValidator = (): (
    | ValidationChain
    | RequestHandler
)[] => [
    query("key", "key password must be string").isString().bail().notEmpty(),
    handleValidation,
];
