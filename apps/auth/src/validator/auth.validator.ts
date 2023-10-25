import { body, header, ValidationChain } from "express-validator";
import { handleValidation } from "app";
import { RequestHandler } from "express";

export const refreshTokenValidator = (): (
    | ValidationChain
    | RequestHandler
)[] => [
    header("refresh-token", "refresh token must not be empty")
        .exists()
        .bail()
        .notEmpty(),
    handleValidation,
];

export const setPasswordValidator = (): (
    | ValidationChain
    | RequestHandler
)[] => [
    header("reset-password-token", "reset password token must not be empty")
        .exists()
        .bail()
        .notEmpty(),
    body("password", "password must not be empty").exists().bail().notEmpty(),
    handleValidation,
];

export const updatePasswordValidator = (): (
    | ValidationChain
    | RequestHandler
)[] => [
    body("old_password", "old password must not be empty")
        .exists()
        .bail()
        .notEmpty(),
    body("new_password", "new_password must not be empty")
        .exists()
        .bail()
        .notEmpty(),
    handleValidation,
];

export const forgotPasswordValidator = (): (
    | ValidationChain
    | RequestHandler
)[] => [
    body("email", "email must not be empty").exists().bail().notEmpty(),
    body("email", "email is not in a valid format")
        .if(body("email").exists().bail().notEmpty())
        .matches(/^[\w._%+-]+@[\w.-]+\.[\w-]{2,63}$/g),
    handleValidation,
];

export const loginValidator = (): (ValidationChain | RequestHandler)[] => [
    body("email", "email must not be empty").exists().bail().notEmpty(),
    body("password", "password must not be empty").exists().bail().notEmpty(),
    handleValidation,
];

export const loginWithCodeValidator = (): (
    | ValidationChain
    | RequestHandler
)[] => [
    header("access-code", "access code must not be empty")
        .exists()
        .bail()
        .notEmpty(),
    handleValidation,
];

export const checkAccountValidator = (): (
    | ValidationChain
    | RequestHandler
)[] => [
    body("email", "email must not be empty").exists().bail().notEmpty(),
    body("email", "email is not in a valid format")
        .if(body("email").exists().bail().notEmpty())
        .matches(/^[\w._%+-]+@[\w.-]+\.[\w-]{2,63}$/g),
    handleValidation,
];
