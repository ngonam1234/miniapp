// import { stringify } from "querystring";
// import axios from "axios";
// import { HttpStatus, Result, success } from "app";
// import { configs } from "../configs";
// import Email from "../models/mail";
// import { getEmailGroup } from "../services/group.service";
// import History from "../models/history";
// import { v1 } from "uuid";
// import logger from "logger";

// export async function genToken(): Promise<string> {
//     const data = stringify({
//         scope: "https://graph.microsoft.com/.default",
//         client_secret: configs.outlook.client_secret,
//         grant_type: configs.outlook.grant_type,
//         client_id: configs.outlook.client_id,
//     });

//     const config = {
//         method: "post",
//         maxBodyLength: Infinity,
//         url:
//             configs.outlook.url_login +
//             "/" +
//             configs.outlook.tenant_id +
//             "/oauth2/v2.0/token",
//         headers: {
//             "Content-Type": "application/x-www-form-urlencoded",
//         },
//         data: data,
//     };

//     const token = await axios.request(config);
//     return token.data.access_token;
// }

// export async function sendMailOutlook(params: {
//     code: string;
//     service_name: string;
//     email?: string[];
//     action_by: string;
//     info: {
//         IDTicket?: string;
//         RequesterName?: string;
//         Subject?: string;
//         TicketLink?: string;
//         GroupName?: string;
//         Assignee?: string;
//         Solution?: string;
//         group?: string;
//     };
// }): Promise<Result> {
//     const errorTemplate = {
//         status: HttpStatus.NOT_FOUND,
//         code: "NOT_FOUND_TEMPLATE_EMAIL",
//         errors: [
//             {
//                 location: "body",
//                 param: "code",
//             },
//         ],
//     };
//     const token = await genToken();
//     const checkTemplate = await Email.findOne({ code: params.code });
//     if (!checkTemplate) {
//         return errorTemplate;
//     }

//     const map_param_content = checkTemplate.params_content.reduce(
//         (a, v) => ({
//             ...a,
//             ["{{" + v + "}}"]:
//                 params.info[v as unknown as keyof typeof params.info],
//         }),
//         {}
//     );
//     const re_1 = new RegExp(Object.keys(map_param_content).join("|"), "gi");

//     checkTemplate.content = checkTemplate.content.replace(re_1, function (mt) {
//         return map_param_content[mt as keyof typeof map_param_content];
//     });

//     const map_param_subject = checkTemplate.params_subject.reduce(
//         (a, v) => ({
//             ...a,
//             ["{{" + v + "}}"]:
//                 params.info[v as unknown as keyof typeof params.info] ?? "N/A",
//         }),
//         {}
//     );
//     const re_2 = new RegExp(Object.keys(map_param_subject).join("|"), "gi");
//     checkTemplate.subject = checkTemplate.subject.replace(re_2, function (mt) {
//         return map_param_subject[mt as keyof typeof map_param_subject];
//     });
//     let emailGroup;
//     if (params.info.group) {
//         emailGroup = await getEmailGroup(params.info.group as string);
//     }
//     let email_to;
//     if (params.info.group) {
//         email_to = emailGroup;
//     } else {
//         email_to = params.email;
//     }

//     //    const email =  {
//     //         "emailAddress": {
//     //             "address": "ducit2509@gmail.com"
//     //         }
//     //     },
//     // let mailOptions;
//     if (params.info.group) {
//         // for (let i = 0; i < email_to!.length; i++) {
//         //     const e = email_to![i];

//         const arr_email_v1: { emailAddress: { address: string } }[] = [];
//         email_to?.forEach((e) => {
//             arr_email_v1.push({
//                 emailAddress: {
//                     address: e,
//                 },
//             });
//         });
//         // mailOptions = {
//         //     from: "FIS - IT HELP DESK <fis-itservices@srv.fis.vn>",
//         //     to: e,
//         //     subject: checkTemplate.subject,
//         //     text: checkTemplate.content,
//         // };
//         const data = JSON.stringify({
//             message: {
//                 subject: checkTemplate.subject,
//                 body: {
//                     contentType: "text",
//                     content: checkTemplate.content,
//                 },
//                 toRecipients: arr_email_v1,
//             },
//             saveToSentItems: "true",
//         });
//         const config = {
//             method: "post",
//             maxBodyLength: Infinity,
//             url:
//                 configs.outlook.url_api +
//                 "/users/" +
//                 configs.outlook.user_id +
//                 "/sendMail",
//             headers: {
//                 Authorization: "Bearer " + token,
//                 "Content-Type": "application/json",
//             },
//             data: data,
//         };
//         // const result = await axios.request(config);
//         // await transporter.sendMail(mailOptions as object).catch((e) => {
//         //     logger.info("error %o", e);
//         //     throw new HttpError({
//         //         status: HttpStatus.INTERNAL_SERVER,
//         //         description: e,
//         //     });
//         // });
//         // }
//     } else {
//         const arr_email: { emailAddress: { address: string } }[] = [];
//         email_to?.forEach((e) => {
//             arr_email.push({
//                 emailAddress: {
//                     address: e,
//                 },
//             });
//         });
//         // mailOptions = {
//         //     from: "FIS - IT HELP DESK <fis-itservices@srv.fis.vn>",
//         //     to: email_to,
//         //     subject: checkTemplate.subject,
//         //     text: checkTemplate.content,
//         // };
//         const data = JSON.stringify({
//             message: {
//                 subject: checkTemplate.subject,
//                 body: {
//                     contentType: "text",
//                     content: checkTemplate.content,
//                 },
//                 toRecipients: arr_email,
//             },
//             saveToSentItems: "true",
//         });
//         const config = {
//             method: "post",
//             maxBodyLength: Infinity,
//             url:
//                 configs.outlook.url_api +
//                 "/users/" +
//                 configs.outlook.user_id +
//                 "/sendMail",
//             headers: {
//                 Authorization: "Bearer " + token,
//                 "Content-Type": "application/json",
//             },
//             data: data,
//         };
//         const result = await axios.request(config);
//         logger.info("000 --- %o", result.data);
//     }
//     const history = new History({
//         id: v1(),
//         service_name: params.service_name,
//         email_to: email_to,
//         code_template: params.code,
//         created_time: new Date(),
//         created_by: params.action_by,
//         content: checkTemplate.content,
//         params_content: map_param_content,
//         params_subject: map_param_subject,
//     });

//     await history.save();

//     return success.ok({ code: HttpStatus.OK });
// }
