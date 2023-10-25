import { handleValidation } from "app";
import { RequestHandler } from "express";
import { ValidationChain, body } from "express-validator";

export const findAutoMatchesTicketValidator = (): (
    | ValidationChain
    | RequestHandler
)[] => [
    body("id", "id must be string").isString().bail().notEmpty(),
    body("tenant", "tenant must be string").isString().bail().notEmpty(),
    handleValidation,
];
