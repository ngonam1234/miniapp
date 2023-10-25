/* eslint-disable no-useless-escape */
import { v1 } from "uuid";
import { Result, HttpStatus, success, HttpError } from "app";

import nodemailer from "nodemailer";
import Mail from "nodemailer/lib/mailer";
import { configs } from "../configs";
import Email from "../models/mail";
import History from "../models/history";
import { getEmailGroup } from "../services/group.service";
import logger from "logger";
import smtpPool from "nodemailer/lib/smtp-pool";
import { isTypedArray } from "util/types";

// const configSendMail = sendmail({
//     logger: {
//         debug: console.log,
//         info: console.info,
//         warn: console.warn,
//         error: console.error
//       },
//       silent: false,
//       devPort: 1025, // Default: False
//       devHost: 'localhost', // Default: localhost
//       smtpPort: 587, // Default: 25
//       smtpHost: '10.33.3.33'

// })

// a({

// })
// const sendEnquiryEmail = function (enquiryData) {
//     let FromUserName = 'Chat2cars';
//     nodemailer.createTestAccount((err, account) => {
//         var transporter = nodemailer.createTransport(smtpPool({

//             host: 'smtp.gmail.com',
//             port: 587,
//              auth: {
//                 user: 'user@gmail.com',
//                 pass: 'mypass'
//             },
//             maxConnections: 5,
//             maxMessages: 10
//     }));

async function getParams(details: string): Promise<Result> {
    const listDetails = details;
    const a2 = [];
    const a1 = listDetails.split("}}");
    a1.pop();
    for (const q of a1) {
        const qs = q.split("{{");
        a2.push(qs[1]);
    }
    const set = [...new Set(a2)];
    return success.ok(set);
}

export async function createT(params: {
    code: string;
    subject: string;
    content: string;
}): Promise<Result> {
    const t = new Email({
        id: v1(),
        code: params.code,
        subject: params.subject,
        content: params.content,
        created_time: new Date(),
        created_by: "Ducnv",
        updated_time: new Date(),
        updated_by: "Ducnv",
        params_content: getParams(params.content),
        params_subject: getParams(params.subject),
    });
    t.save();
    return success.ok(t);
}

export async function getParamsByCode(code: string): Promise<Result> {
    const errorTemplate = {
        status: HttpStatus.NOT_FOUND,
        code: "NOT_FOUND_TEMPLATE_EMAIL",
        errors: [
            {
                location: "body",
                param: "code",
            },
        ],
    };
    const checkTemplate = await Email.findOne({ code: code });
    if (!checkTemplate) {
        return errorTemplate;
    }
    checkTemplate.params_content.push(...checkTemplate.params_subject);
    const infoParams = [...new Set(checkTemplate.params_content)];
    return success.ok(infoParams);
}

// const transporter = nodemailer.createTransport(
//     // new smtpPool(
//     {
//         // pool: true,
//         host: configs.mail.host,
//         port: Number(configs.mail.port),
//         secure: false,
//         auth: {
//             user: configs.mail.user,
//             pass: configs.mail.pass,
//         },
//         tls: {
//             rejectUnauthorized: false,
//         },
//     }
//     // )
// );

const transporter = nodemailer.createTransport({
    host: configs.mail.host,
    port: Number(configs.mail.port),
    auth: {
        user: configs.mail.user,
        pass: configs.mail.pass,
    },
    tls: {
        rejectUnauthorized: false,
    },
});
export async function sendMailBasic(params: {
    code: string;
    service_name: string;
    email: string[];
    action_by: string;
    info: {
        IDTicket?: string;
        RequesterName?: string;
        Subject?: string;
        TicketLink?: string;
        GroupName?: string;
        Assignee?: string;
        Solution?: string;
        group?: string;
        Tech?: string;
    };
}): Promise<Result> {
    // logger.info("---> params %o", params);
    const errorTemplate = {
        status: HttpStatus.NOT_FOUND,
        code: "NOT_FOUND_TEMPLATE_EMAIL",
        errors: [
            {
                location: "body",
                param: "code",
            },
        ],
    };
    const checkTemplate = await Email.findOne({ code: params.code });
    if (!checkTemplate) {
        return errorTemplate;
    }

    const map_param_content = checkTemplate.params_content.reduce(
        (a, v) => ({
            ...a,
            ["{{" + v + "}}"]:
                params.info[v as unknown as keyof typeof params.info],
        }),
        {}
    );
    const re_1 = new RegExp(Object.keys(map_param_content).join("|"), "gi");

    checkTemplate.content = checkTemplate.content.replace(re_1, function (mt) {
        return map_param_content[mt as keyof typeof map_param_content];
    });

    const map_param_subject = checkTemplate.params_subject.reduce(
        (a, v) => ({
            ...a,
            ["{{" + v + "}}"]:
                params.info[v as unknown as keyof typeof params.info] ?? "N/A",
        }),
        {}
    );
    const re_2 = new RegExp(Object.keys(map_param_subject).join("|"), "gi");
    checkTemplate.subject = checkTemplate.subject.replace(re_2, function (mt) {
        return map_param_subject[mt as keyof typeof map_param_subject];
    });
    let emailGroup;
    if (params.info.group) {
        emailGroup = await getEmailGroup(params.info.group as string);
    }
    let email_to;
    if (params.info.group) {
        email_to = emailGroup;
    } else {
        email_to = params.email;
    }

    let mailOptions;
    if (params.info.group && email_to) {
        logger.info("---------------> A");
        for (let i = 0; i < email_to.length; i++) {
            const e = email_to[i];
            if (e.match(/^[\w-\.]+@test.com/g)) {
                return success.ok({ message: "Not send mail" });
            } else {
                mailOptions = {
                    from: `FIS - IT HELP DESK <${configs.mail.user}>`,
                    to: e,
                    subject: checkTemplate.subject,
                    text: checkTemplate.content,
                };
                await transporter.sendMail(mailOptions as object).catch((e) => {
                    logger.info("error %o", e);
                    throw new HttpError({
                        status: HttpStatus.INTERNAL_SERVER,
                        description: e,
                    });
                });
            }
        }
    } else {
        logger.info("---------------> B");
        const email = [];
        if (isTypedArray(email_to) == false) {
            email.push(email_to);
        }
        for (let i = 0; i < email!.length; i++) {
            const e = email![i] as unknown as string;
            if (e.match(/^[\w-\.]+@test.com/g)) {
                return success.ok({ message: "Not send mail" });
            } else {
                mailOptions = {
                    from: `FIS - IT HELP DESK <${configs.mail.user}>`,
                    to: email_to,
                    subject: checkTemplate.subject,
                    text: checkTemplate.content,
                };
                await transporter.sendMail(mailOptions as object).catch((e) => {
                    logger.info("error %o", e);
                    throw new HttpError({
                        status: HttpStatus.INTERNAL_SERVER,
                        description: e,
                    });
                });
            }
        }
    }

    const history = new History({
        id: v1(),
        service_name: params.service_name,
        email_to: email_to,
        code_template: params.code,
        created_time: new Date(),
        created_by: params.action_by,
        content: mailOptions?.text,
        params_content: map_param_content,
        params_subject: map_param_subject,
    });

    await history.save();

    return success.ok({ code: HttpStatus.OK });
}

export async function sendMailResetPassword(params: {
    email: string;
    link: string;
}): Promise<Result> {
    const mailOptions: Mail.Options = {
        from: `FIS - IT HELP DESK <${configs.mail.user}>`,
        to: `${params.email}`,
        subject: `[ServiceDesk] Đặt lại mật khẩu cho tài khoản Service Desk của bạn`,
        html: `
        <div>Chào chào ${params.email},</div>
        <br/>
        <div>
            <span>Gần đây bạn có yêu cầu tạo lại mật khẩu tài khoản của bạn trên hệ thống ServiceDesk, để tiếp tục quá trình này, hãy nhấn vào </span>
            <a href = "${params.link}">link</a>
        </div>
        <div>Liên kết này sẽ hết hạn trong vòng 10 phút.</div>
        <br/>
        <div>Trân trọng,</div>
        <div>IT HelpDesk Team.</div>`,
    };

    await transporter.sendMail(mailOptions).catch((e) => {
        logger.info("e ___> %o", e);
        throw new HttpError({
            status: HttpStatus.INTERNAL_SERVER,
            description: e,
        });
    });
    return success.ok({ message: "success" });
}
