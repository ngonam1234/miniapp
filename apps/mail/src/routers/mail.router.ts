import {
    SendMailBody,
    SendMailResetPassReqBody,
} from "./../interfaces/request/mail.body";

import { NextFunction, Request, Response, Router } from "express";
import {
    getParamsByCode,
    sendMailBasic,
    sendMailResetPassword,
} from "../controllers";
import { sendMailResetPasswordValidator } from "../validator";
import {
    sendMailByTenten,
    sendMailResetPasswordTenten,
} from "../controllers/mail-tenten.controller";

export const router: Router = Router();

router.get("/:code", async (req: Request, _: Response, next: NextFunction) => {
    const code = req.params.code as string;
    const result = await getParamsByCode(code);
    next(result);
});

router.post("/send", async (req: Request, _: Response, next: NextFunction) => {
    const body = req.body as SendMailBody;
    const result = await sendMailBasic(body);
    next(result);
});

router.post(
    "/send-tenten",
    async (req: Request, _: Response, next: NextFunction) => {
        const body = req.body as SendMailBody;
        const result = await sendMailByTenten(body);
        next(result);
    }
);

// router.post(
//     "/outlook",
//     async (req: Request, _: Response, next: NextFunction) => {
//         const body = req.body as SendMailBody;
//         const result = await sendMailOutlook(body);
//         next(result);
//     }
// );

router.post(
    "/reset-password",
    sendMailResetPasswordValidator(),
    async (req: Request, _: Response, next: NextFunction) => {
        const body = req.body as SendMailResetPassReqBody;
        const result = await sendMailResetPassword(body);
        next(result);
    }
);

router.post(
    "/reset-password-tenten",
    sendMailResetPasswordValidator(),
    async (req: Request, _: Response, next: NextFunction) => {
        const body = req.body as SendMailResetPassReqBody;
        const result = await sendMailResetPasswordTenten(body);
        next(result);
    }
);
