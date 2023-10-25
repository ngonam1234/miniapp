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
import { sendMailTenten } from "../services/tenten.service";

export async function sendMailByTenten(params: {
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
                    fromName: "AKA247 Service Desk",
                    subject: checkTemplate.subject,
                    to: e,
                    text: checkTemplate.content,
                };
                await sendMailTenten(mailOptions);
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
                    fromName: `AKA247 Service Desk`,
                    to: e,
                    subject: checkTemplate.subject,
                    text: checkTemplate.content,
                };
                logger.info("mailOptions %o", mailOptions);
                await sendMailTenten(mailOptions);
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

export async function sendMailResetPasswordTenten(params: {
    email: string;
    link: string;
}): Promise<Result> {
    const mailOptions = {
        fromName: `AKA247 Service Desk`,
        to: `${params.email}`,
        subject: `[ServiceDesk] Đặt lại mật khẩu cho tài khoản Service Desk của bạn`,
        text: `
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

    await sendMailTenten(mailOptions);
    return success.ok({ message: "success" });
}
