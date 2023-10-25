import jsonwebtoken, { VerifyOptions } from "jsonwebtoken";
import { NextFunction, Request, Response } from "express";
import { ErrorDetail, HttpError } from "app";
import { Payload, HttpStatus } from "app";
import { configs } from "../configs";

export function verifyToken(
    req: Request,
    _: Response,
    next: NextFunction
): void {
    const option = { algorithm: "RS256" } as VerifyOptions;
    const token: string | undefined = req.header("token");
    const errors: ErrorDetail[] = [
        {
            param: "token",
            location: "header",
        },
    ];
    if (!token) {
        throw new HttpError({
            status: HttpStatus.UNAUTHORIZED,
            code: "NO_TOKEN",
            errors: errors,
        });
    }
    try {
        const publicKey = configs.keys.public;
        const payload = <Payload>jsonwebtoken.verify(token, publicKey, option);
        req.payload = payload;
        if (payload.type !== "ACCESS_TOKEN") {
            return next({
                status: HttpStatus.UNAUTHORIZED,
                code: "INVALID_TOKEN",
                errors: errors,
            });
        }
        return next();
    } catch (error) {
        const e: Error = error as Error;
        if (e.name && e.name === "TokenExpiredError") {
            return next({
                status: HttpStatus.UNAUTHORIZED,
                code: "TOKEN_EXPIRED",
                errors: errors,
            });
        } else {
            return next({
                status: HttpStatus.UNAUTHORIZED,
                code: "INVALID_TOKEN",
                errors: errors,
            });
        }
    }
}
