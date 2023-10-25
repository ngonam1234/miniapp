import { HttpStatus, error } from "app";
import { NextFunction, Request, RequestHandler, Response } from "express";
import { RoleType } from "../interfaces/response";
import { findRoleByIds } from "../services";

export function verifySystemAdmin(
    req: Request,
    _: Response,
    next: NextFunction
): void {
    const errorResult = error.actionNotAllowed();
    if (!req.payload) {
        return next(errorResult);
    }

    const { roles } = req.payload;
    if (roles.includes("SA")) {
        return next();
    } else {
        return next(errorResult);
    }
}

export function verifyTenantUser(
    req: Request,
    _: Response,
    next: NextFunction
): void {
    const errorResult = error.actionNotAllowed();
    if (!req.payload) {
        return next(errorResult);
    }
    const { tenant } = req.payload;
    if (tenant) {
        return next();
    } else {
        return next(errorResult);
    }
}

export function verifyRole(...roles: string[]): RequestHandler {
    if (roles.includes("*")) {
        roles.push("SA", "TA", "EU", "L*");
    }

    if (roles.includes("L*")) {
        roles.push("L1", "L2");
    }

    return async (req: Request, _: Response, next: NextFunction) => {
        const errorResult = error.actionNotAllowed();
        if (!req.payload) {
            return next(errorResult);
        }

        const { roles: userRoles } = req.payload;
        let isRoleOke = false;

        const response = await findRoleByIds(userRoles);
        if (response.status === HttpStatus.OK) {
            const { body } = response;
            body?.map((r) => {
                if (
                    // all roles
                    roles.includes("*") ||
                    // specific role
                    // SA
                    (roles.includes("SA") &&
                        r.type === RoleType.DEFAULT &&
                        r.id === "SA") ||
                    // TA
                    (roles.includes("TA") &&
                        r.type === RoleType.DEFAULT &&
                        r.id === "TA") ||
                    // L1
                    (roles.includes("L1") &&
                        (r.type === RoleType.EMPLOYEE ||
                            (r.type.includes(RoleType.DEFAULT) &&
                                r.id === "L1"))) ||
                    // L2
                    (roles.includes("L2") &&
                        (r.type === RoleType.EMPLOYEE ||
                            (r.type.includes(RoleType.DEFAULT) &&
                                r.id === "L2"))) ||
                    // EU
                    (roles.includes("EU") &&
                        (r.type === RoleType.CUSTOMER ||
                            (r.type.includes(RoleType.DEFAULT) &&
                                r.id === "EU")))
                ) {
                    isRoleOke = true;
                }
            });
            if (isRoleOke) {
                return next();
            }
        }
        return next(errorResult);
    };
}
