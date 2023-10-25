import jsonwebtoken, { JwtPayload } from "jsonwebtoken";
import { error, HttpStatus, Result, ResultError, success } from "app";
import bcrypt from "bcrypt";
import logger from "logger";
import { configs } from "../configs";
import { redis } from "../database";
import { Account, User } from "../models";
import { data } from "../configs/match";
import {
    verifyAccessCode,
    getTenantByCode,
    sendMailResetPassword,
    verifyKeyCloak,
    getTenantByEmail,
    findRoleType,
} from "../services";
import {
    genAccessToken,
    genRefreshToken,
    genResetPasswordToken,
    getPayload,
} from "../token";
import { updateUserActivity } from "./user.controller";
import { v1 } from "uuid";
import { UserAction } from "../interfaces/models";
import { createAccount } from "./account.controller";

export async function login(params: {
    email: string;
    password: string;
}): Promise<Result> {
    try {
        const numberOfTried = 5;
        const [account, user] = await Promise.all([
            Account.findOne(
                { email: { $regex: `^${params.email}$`, $options: "i" } },
                { created_time: 0 }
            ),
            User.findOne(
                { email: { $regex: `^${params.email}$`, $options: "i" } },
                { _id: 0, activities: 0 }
            ).lean(),
        ]);
        if (account && account.password) {
            if (account.failed_login === numberOfTried - 1) {
                account.last_locked = new Date();
            } else if (account.failed_login === numberOfTried) {
                const lastLocked = account.last_locked
                    ? account.last_locked
                    : new Date();
                const now = new Date();
                const diffInMicrosecond = now.getTime() - lastLocked.getTime();
                const diffInMinutes = Math.ceil(
                    diffInMicrosecond / (60 * 1000)
                );
                if (diffInMinutes <= 30) {
                    return {
                        code: "ACCOUNT_IS_LOCKED",
                        status: HttpStatus.UNAUTHORIZED,
                        errors: [
                            {
                                location: "body",
                                param: "email",
                            },
                        ],
                    };
                } else {
                    account.failed_login = 0;
                }
            }
            const isPasswordOke = bcrypt.compareSync(
                params.password,
                account.password
            );

            if (isPasswordOke) {
                const isActive = account?.tenant
                    ? account.tenant?.is_active && account?.is_active
                    : account?.is_active;
                if (!isActive) {
                    return accountInactiveError();
                }
                if (account.roles.length === 0) {
                    return accountRolesEmpty();
                }
                const { id, roles, tenant, email } = account;

                let layout: string | undefined = undefined;
                const response = await findRoleType(roles, tenant?.code);
                if (response.status === HttpStatus.OK) {
                    layout = response.body?.typeRole;
                }
                const accessToken = genAccessToken({
                    id,
                    roles,
                    email,
                    tenant: tenant?.code,
                });
                const refreshToken = genRefreshToken(id);
                const data = {
                    ...{
                        ...user,
                        _id: undefined,
                    },
                    accessToken: accessToken.token,
                    refreshToken: refreshToken.token,
                    roles: account.roles,
                    layout,
                    activities: undefined,
                };
                account.failed_login = 0;
                await Promise.all([
                    saveTokenSignature({
                        userId: id,
                        token: accessToken.token,
                        expireAt: accessToken.expireAt,
                    }),
                    account.save(),
                ]);
                // eventKafka({
                //     event_data: data as object,
                //     topic: "auth",
                //     module: "auth",
                //     action: params.email,
                //     type: TypeHistory.LOGIN,
                //     broker: [configs.kafka.broker as string],
                //     username: configs.kafka.username as string,
                //     password: configs.kafka.password as string,
                // });
                return success.ok(data);
            } else {
                account.failed_login += 1;
                await account.save();
                return wrongPasswordError();
            }
        } else {
            return accountNotFoundError();
        }
    } catch (err) {
        logger.debug("%o", err);
        throw err;
    }
}

export async function loginWithAccessCode(accessCode: string): Promise<Result> {
    const response = await verifyAccessCode({ accessCode });
    if (response.body) {
        const [account, user] = await Promise.all([
            Account.findOne(
                {
                    email: {
                        $regex: `^${response.body.email}$`,
                        $options: "i",
                    },
                },
                { created_time: 0 }
            ),
            User.findOne(
                {
                    email: {
                        $regex: `^${response.body.email}$`,
                        $options: "i",
                    },
                },
                { _id: 0, activities: 0 }
            ).lean(),
        ]);
        if (account) {
            const isActive = account?.tenant
                ? account.tenant?.is_active && account?.is_active
                : account?.is_active;
            if (!isActive) {
                return accountInactiveError();
            }
            if (account.roles.length === 0) {
                return accountRolesEmpty();
            }
            const { id, roles, tenant, email } = account;
            const accessToken = genAccessToken({
                id,
                roles,
                email,
                tenant: tenant?.code,
            });
            const refreshToken = genRefreshToken(id);
            const data = {
                ...{
                    ...user,
                    _id: undefined,
                },
                accessToken: accessToken.token,
                refreshToken: refreshToken.token,
                roles: account.roles,
                activities: undefined,
            };
            account.failed_login = 0;
            await Promise.all([
                saveTokenSignature({
                    userId: id,
                    token: accessToken.token,
                    expireAt: accessToken.expireAt,
                }),
                account.save(),
            ]);
            return success.ok(data);
        } else {
            return accountNotFoundError();
        }
    } else {
        return wrongPasswordError();
    }
}

export async function newToken(refreshToken: string): Promise<Result> {
    const payload = getPayload(refreshToken);
    const errors = [
        {
            param: "token",
            location: "header",
        },
    ];
    if (payload instanceof Error) {
        const err = payload;
        if (err.name && err.name === "TokenExpiredError") {
            return {
                status: HttpStatus.UNAUTHORIZED,
                code: "TOKEN_EXPIRED",
                errors: errors,
            };
        } else {
            return {
                status: HttpStatus.UNAUTHORIZED,
                code: "INVALID_TOKEN",
                errors: errors,
            };
        }
    }

    const [user, account] = await Promise.all([
        User.findOne({ id: payload.id }, { _id: 0, activities: 0 }),
        Account.findOne({ id: payload.id }, { _id: 0, password: 0 }),
    ]);

    if (account) {
        const isActive = account?.tenant
            ? account.tenant?.is_active && account?.is_active
            : account?.is_active;
        if (!isActive) {
            return accountInactiveError();
        }
        const { id, roles, tenant, email } = account;
        // let department: IDepartmentResBody = {};
        // if (tenant && user) {
        //     const temp = await findDepartmentById({
        //         id: user.department,
        //         tenant: tenant.code,
        //     });
        //     department = temp.body as IDepartmentResBody;
        // }
        const accessToken = genAccessToken({
            id,
            roles,
            email,
            tenant: tenant?.code,
            // department: {
            //     id: department.id,
            //     name: department.name,
            // },
        });
        const refreshToken = genRefreshToken(id);
        const data = {
            ...{
                ...user,
                _id: undefined,
            },
            accessToken: accessToken.token,
            refreshToken: refreshToken.token,
            roles: account.roles,
            activities: undefined,
        };
        await saveTokenSignature({
            userId: id,
            token: accessToken.token,
            expireAt: accessToken.expireAt,
        });
        return { status: HttpStatus.OK, data };
    } else {
        return accountNotFoundError();
    }
}

export async function forgotPassword(params: {
    email: string;
    domain?: string;
}): Promise<Result> {
    const account = await Account.findOne(
        {
            email: { $regex: `^${params.email}$`, $options: "i" },
            is_active: true,
        },
        { created_time: 0, is_active: 0, activities: 0 }
    );
    if (!account) {
        return invalidAccountError();
    }

    account.token_time = new Date();
    const token = genResetPasswordToken(
        account.id,
        account.token_time,
        account.password
    );
    account.password_token = token;
    await account.save();
    const link = `${params.domain}/reset-password/${token}`;
    await sendMailResetPassword(account.email, link);
    return success.ok({ message: "success" });
}

export async function setPassword(params: {
    token: string;
    password: string;
}): Promise<Result> {
    const account = await Account.findOne({ password_token: params.token });
    const tokenInvalidError = error.invalidData({
        location: "header",
        param: "reset-password",
        value: params.token,
        message: "reset password token is not valid",
    });
    const tokenTime = account?.token_time ? account?.token_time : new Date();
    const now = new Date();
    const diffInMicrosecond = now.getTime() - tokenTime.getTime();
    const diffInMinutes = Math.ceil(diffInMicrosecond / (60 * 1000));
    if (!account || diffInMinutes > 10) {
        return tokenInvalidError;
    }

    const arePasswordsSame = account.password
        ? bcrypt.compareSync(params.password, account.password)
        : false;
    if (arePasswordsSame) {
        return error.invalidData({
            location: "body",
            param: "password",
            value: params.password,
            message: "the old password and the new password are same",
            description: {
                vi: "Mật khẩu mới không thể trùng với mật khẩu cũ",
                en: "The new password can not be same with the old password",
            },
        });
    }

    const sr = Number(configs.saltRounds);
    const hashedPassword = await bcrypt.hash(
        params.password,
        await bcrypt.genSalt(sr)
    );
    account.password = hashedPassword;
    account.password_token = undefined;
    await Promise.all([
        User.findOneAndUpdate(
            { id: account.id, is_active: true },
            {
                $push: {
                    activities: {
                        action: "RESET_PASSWORD",
                        actor: account.id,
                        time: new Date(),
                    },
                },
            },
            { projection: { _id: 0 } }
        ),
        account.save(),
    ]);
    return success.ok({ message: "success" });
}

export async function updatePassword(params: {
    userId: string;
    old_password: string;
    new_password: string;
}): Promise<Result> {
    const account = await Account.findOne({ id: params.userId });
    if (!account) {
        return error.invalidData({
            location: "header",
            param: "token",
            value: params.userId,
            message: "access token is not valid",
        });
    }

    if (params.old_password == params.new_password) {
        return error.invalidData({
            location: "body",
            param: "old_password|new_password",
            value: `${params.old_password}|${params.new_password}`,
            message: "the old password and the new password are same",
            description: {
                vi: "Mật khẩu mới không thể trùng với mật khẩu cũ",
                en: "The new password can not be same with the old password",
            },
        });
    }

    const arePasswordsSame = account.password
        ? bcrypt.compareSync(params.old_password, account.password)
        : false;
    if (!arePasswordsSame && account.password) {
        return error.invalidData({
            location: "body",
            param: "old_password",
            value: params.old_password,
            message: "the old password is not correct",
            description: {
                vi: "Mật khẩu cũ không chính xác",
                en: "The old password is not correct",
            },
        });
    }

    const sr = Number(configs.saltRounds);
    const hashedPassword = await bcrypt.hash(
        params.new_password,
        await bcrypt.genSalt(sr)
    );
    account.password = hashedPassword;
    await Promise.all([
        updateUserActivity({
            id: account.id,
            action: "UPDATE_PASSWORD",
            actor: account.id,
        }),
        account.save(),
    ]);
    return success.ok({ message: "success" });
}

async function saveTokenSignature(params: {
    userId: string;
    token: string;
    expireAt: number;
}): Promise<void> {
    const now = Math.floor(new Date().getTime() / 1000);
    const key = `ca:token:user:${params.userId}`;
    if (redis.status !== "ready") {
        await redis.connect();
    }
    const signature: string = params.token.split(".")[2];
    const redisCheck = await Promise.all([
        redis.zadd(key, params.expireAt + 1, signature),
        redis.expireat(key, params.expireAt + 1),
        redis.zremrangebyscore(key, "-inf", now),
    ]);
    logger.info("redisCheck %o", redisCheck);
}

function matchRegex(email: string): { url: string } {
    let url = "";
    for (let i = 0; i < data.length; i++) {
        const e = data[i];
        if (email.match(new RegExp(e.regex))) {
            url = e.url;
        }
    }
    return { url };
}

export async function checkAccount(params: { email: string }): Promise<Result> {
    const url_ad = matchRegex(params.email);
    // const checkAccount = await Account.findOne({email: params.email})
    if (url_ad.url) {
        return success.ok({ type: "KEYCLOAK", url: url_ad.url });
    }
    const account = await Account.findOne(
        { email: { $regex: `^${params.email}$`, $options: "i" } },
        { created_time: 0, activities: 0 }
    );
    if (!account) {
        return invalidAccountError();
    } else {
        const isActive = account?.tenant
            ? account.tenant?.is_active && account?.is_active
            : account?.is_active;
        if (!isActive) {
            return invalidAccountError();
        }
        if (account.password) {
            return success.ok({ type: "NORMAL" });
        } else {
            const tenant = await getTenantByCode(
                account?.tenant?.code as string
            );
            return success.ok({ url: tenant.body?.webconsent_url, type: "AD" });
        }
    }
}

export async function checkLoginKeyCloak(params: {
    session_state: string;
    code: string;
    redirect_uri: string;
}): Promise<Result> {
    const check = await verifyKeyCloak({
        grant_type: "authorization_code",
        client_id: "kc_client",
        code: params.code,
        redirect_uri: params.redirect_uri,
        session_state: params.session_state,
    });
    if (check.body?.access_token) {
        const info = jsonwebtoken.decode(check.body.access_token) as JwtPayload;
        // const account = await Account.findOne({ email: info.email });
        const [account, user] = await Promise.all([
            Account.findOne(
                { email: { $regex: `^${info.email}$`, $options: "i" } },
                { created_time: 0 }
            ),
            User.findOne(
                { email: { $regex: `^${info.email}$`, $options: "i" } },
                { _id: 0, activities: 0 }
            ).lean(),
        ]);
        // logger.info("account %o", account)
        // logger.info("user %o", user)
        if (!account || !user) {
            const tenant = await getTenantByEmail(info.email);
            const id = v1();
            const user = new User({
                id: id,
                fullname: info.name,
                email: info.email,
                tenant: tenant.body?.code,
                created_time: new Date(),
                is_active: true,
                activities: [
                    {
                        action: UserAction.CREATE,
                        actor: v1(),
                        time: new Date(),
                    },
                ],
            });

            await Promise.all([
                createAccount([
                    {
                        id: id,
                        email: info.email,
                        is_active: true,
                        roles: ["EU"],
                        tenant: tenant.body?.code,
                    },
                ]),
                user.save(),
            ]);
            const accessToken = genAccessToken({
                id: id,
                roles: ["EU"],
                email: user.email,
                tenant: tenant?.body?.code,
            });
            const refreshToken = genRefreshToken(id);
            const data = {
                ...user,
                accessToken: accessToken.token,
                refreshToken: refreshToken.token,
                roles: ["EU"],
                activities: undefined,
            };
            await Promise.all([
                saveTokenSignature({
                    userId: id,
                    token: accessToken.token,
                    expireAt: accessToken.expireAt,
                }),
                account?.save(),
            ]);
            return success.ok(data);
        } else {
            const accessToken = genAccessToken({
                id: account.id,
                roles: account.roles,
                email: account.email,
                tenant: account.tenant?.code,
            });
            const refreshToken = genRefreshToken(account.id);
            const data = {
                ...user,
                accessToken: accessToken.token,
                refreshToken: refreshToken.token,
                roles: account.roles,
                activities: undefined,
            };
            await Promise.all([
                saveTokenSignature({
                    userId: user.id,
                    token: accessToken.token,
                    expireAt: accessToken.expireAt,
                }),
                account.save(),
            ]);
            return success.ok(data);
        }
    } else {
        return accountNotFoundError();
    }
}
const accountInactiveError = (): ResultError => {
    return {
        status: HttpStatus.UNAUTHORIZED,
        code: "ACCOUNT_IS_INACTIVE",
        errors: [
            {
                location: "body",
                param: "email",
            },
        ],
    };
};

const accountNotFoundError = (): ResultError => {
    return {
        status: HttpStatus.UNAUTHORIZED,
        code: "NOT_FOUND_EMAIL",
        errors: [
            {
                location: "body",
                param: "email|password",
            },
        ],
    };
};

const invalidAccountError = (): ResultError => {
    return {
        status: HttpStatus.UNAUTHORIZED,
        code: "INVALID_ACCOUNT",
        errors: [
            {
                location: "body",
                param: "email",
            },
        ],
    };
};

const wrongPasswordError = (): ResultError => {
    return {
        status: HttpStatus.UNAUTHORIZED,
        code: "WRONG_EMAIL_OR_PASSWORD",
        errors: [
            {
                location: "body",
                param: "email|password",
            },
        ],
    };
};

const accountRolesEmpty = (): ResultError => {
    return {
        status: HttpStatus.UNAUTHORIZED,
        code: "ROLES_IS_EMPTY",
        errors: [
            {
                location: "body",
                param: "email|password",
            },
        ],
    };
};
