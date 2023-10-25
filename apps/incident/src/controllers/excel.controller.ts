import { ITicket } from "../interfaces/models";
import ExcelJs from "exceljs";
import { HttpError, error } from "app";
import { ParseSyntaxError } from "mquery";
import { getUserById } from "../service";
import { resolve } from "path";
import { Row } from "../interfaces/response/excel.body";
import { Element } from "cheerio";
const cheerio = require("cheerio");

export async function getTicketWorkbookForSLA(params: {
    sla?: boolean;
    userId: string;
    start: Date;
    end: Date;
    tickets: ITicket[];
}): Promise<ExcelJs.Workbook> {
    function toFormat(date: Date | undefined): string {
        let result = "";
        if (date !== undefined) {
            result =
                (date.getUTCDate() > 9
                    ? date.getUTCDate()
                    : "0" + date.getUTCDate()) +
                "/" +
                (date.getUTCMonth() > 8
                    ? date.getUTCMonth() + 1
                    : "0" + (date.getUTCMonth() + 1)) +
                "/" +
                date.getUTCFullYear() +
                " " +
                date.getHours() +
                ":" +
                `${
                    date.getMinutes() < 10
                        ? `0${date.getMinutes()}`
                        : date.getMinutes()
                }`;
        }
        return result;
    }
    const user = await getUserById(params.userId);

    const workbook = new ExcelJs.Workbook();
    const path = __dirname;
    let filename;
    let sheetText;
    if (params.sla !== undefined) {
        filename = resolve(
            path,
            "../..",
            "template/ServiceDeskMBFDT_TemplateReportSLA.xlsx"
        );
        sheetText = "SLA incident";
    } else {
        filename = resolve(
            path,
            "../..",
            "template/ServiceDeskMBFDT_TemplateReport.xlsx"
        );
        sheetText = "All incident";
    }
    try {
        await workbook.xlsx.readFile(`${filename}`);
    } catch (e) {
        const err = e as unknown as ParseSyntaxError;
        throw new HttpError(
            error.invalidData({
                location: "__dirname",
                param: err.type,
                message: err.message + "   " + filename,
                value: err.value,
            })
        );
    }

    const worksheet = workbook.getWorksheet(sheetText);
    const tickets_columns = [
        { key: "stt", width: 4 },
        { key: "code", width: 15 },
        { key: "name", width: 25 },
        { key: "requester", width: 25 },
        { key: "description", width: 40 },
        { key: "email", width: 30 },
        { key: "department", width: 30 },
        { key: "created_time", width: 15 },
        { key: "creator", width: 20 },
        { key: "status", width: 10 },
        { key: "type", width: 20 },
        { key: "channel", width: 15 },
        { key: "group", width: 25 },
        { key: "technician", width: 20 },
        { key: "impact", width: 20 },
        { key: "urgency", width: 20 },
        { key: "priority", width: 15 },
        { key: "service", width: 15 },
        { key: "sub_service", width: 15 },
        { key: "overdue_time", width: 15 },
        { key: "sla", width: 20 },
        { key: "overdue_time_response", width: 15 },
        { key: "overdue_time_resolving", width: 15 },
        { key: "time_limit_response", width: 20 },
        { key: "time_limit_resolving", width: 20 },
        { key: "closed_time", width: 15 },
        // { key: "is_overdue_response", width: 20 },
        // { key: "is_overdue_resolving", width: 20 },
    ];
    const rows: Row[] = [];
    let i = 1;
    for (const ticket of params.tickets) {
        const showDescription = getContentHTML(ticket.description);
        const row: Row = {
            stt: String(i),
            code: ticket.number,
            name: ticket.name,
            requester: ticket.requester.fullname,
            description: `${showDescription}`,
            email: ticket.requester.email,
            department: ticket.requester.department
                ? ticket.requester.department.name
                : "",
            created_time: `${
                typeof ticket.created_time === "string"
                    ? toFormat(new Date(ticket.created_time))
                    : toFormat(ticket.created_time)
            }`,
            creator:
                ticket.creator && ticket.creator.fullname
                    ? ticket.creator.fullname
                    : "",
            status: ticket.status ? ticket.status.name : "",
            type: ticket.type ? ticket.type.name : "",
            channel: ticket.channel ? ticket.channel.name : "",
            group: ticket.group ? ticket.group.name : "",
            technician: ticket.technician ? ticket.technician.fullname : "",
            impact: ticket.impact ? ticket.impact.name : "",
            urgency: ticket.urgency ? ticket.urgency.name : "",
            priority: ticket.priority ? ticket.priority.name : "",
            service: ticket.service ? ticket.service.name : "",
            sub_service: ticket.sub_service ? ticket.sub_service.name : "",
            overdue_time: `${
                typeof ticket.overdue_time === "string"
                    ? toFormat(new Date(ticket.overdue_time))
                    : toFormat(ticket.overdue_time)
            }`,
            sla: ticket.sla ? ticket.sla.name : "",
            overdue_time_response:
                ticket.sla && ticket.sla.response_assurance?.overdue_time
                    ? `${
                          typeof ticket.sla.response_assurance?.overdue_time ===
                          "string"
                              ? toFormat(
                                    new Date(
                                        ticket.sla.response_assurance?.overdue_time
                                    )
                                )
                              : toFormat(
                                    ticket.sla.response_assurance?.overdue_time
                                )
                      }`
                    : "",
            overdue_time_resolving:
                ticket.sla && ticket.sla.resolving_assurance?.overdue_time
                    ? `${
                          typeof ticket.sla.resolving_assurance
                              ?.overdue_time === "string"
                              ? toFormat(
                                    new Date(
                                        ticket.sla.resolving_assurance?.overdue_time
                                    )
                                )
                              : toFormat(
                                    ticket.sla.resolving_assurance?.overdue_time
                                )
                      }`
                    : "",
            time_limit_response:
                ticket.sla && ticket.sla.response_assurance?.actual_time
                    ? `${
                          typeof ticket.sla.response_assurance?.actual_time ===
                          "string"
                              ? toFormat(
                                    new Date(
                                        ticket.sla.response_assurance?.actual_time
                                    )
                                )
                              : toFormat(
                                    ticket.sla.response_assurance?.actual_time
                                )
                      }`
                    : "",
            time_limit_resolving:
                ticket.sla && ticket.sla.resolving_assurance?.actual_time
                    ? `${
                          typeof ticket.sla.resolving_assurance?.actual_time ===
                          "string"
                              ? toFormat(
                                    new Date(
                                        ticket.sla.resolving_assurance?.actual_time
                                    )
                                )
                              : toFormat(
                                    ticket.sla.resolving_assurance?.actual_time
                                )
                      }`
                    : "",
            closed_time: `${
                typeof ticket.closed_time === "string"
                    ? toFormat(new Date(ticket.closed_time))
                    : toFormat(ticket.closed_time)
            }`,
            // is_overdue_response:
            //     ticket.sla && ticket.sla.response_assurance
            //         ? `${
            //               ticket.sla.response_assurance.is_overdue === false
            //                   ? "Đúng hạn"
            //                   : "Trễ hạn"
            //           }`
            //         : "",
            // is_overdue_resolving:
            //     ticket.sla && ticket.sla.resolving_assurance
            //         ? `${
            //               ticket.sla.resolving_assurance.is_overdue === false
            //                   ? "Đúng hạn"
            //                   : "Trễ hạn"
            //           }`
            //         : "",
        };
        i++;
        rows.push(row);
    }
    worksheet.columns = tickets_columns;
    worksheet
        .getRow(4)
        .getCell(2).value = `Kỳ báo cáo theo ngày tạo yêu cầu: từ ${toFormat(
        params.start
    )} đến  ${toFormat(params.end)}`;
    worksheet.getRow(5).getCell(2).value = `Thời gian xuất báo cáo: ${toFormat(
        new Date()
    )}`;
    worksheet
        .getRow(6)
        .getCell(
            2
        ).value = `Người xuất báo cáo:  ${user.body?.fullname} (${user.body?.email})`;
    worksheet.insertRows(10, rows, "i+");
    worksheet.spliceRows(9, 1);
    return workbook;
}

export async function getTicketWorkbook(params: {
    userId: string;
    start: Date;
    end: Date;
    tickets: ITicket[];
}): Promise<ExcelJs.Workbook> {
    function toFormat(date: Date | undefined): string {
        let result = "";
        if (date !== undefined) {
            result =
                (date.getUTCDate() > 9
                    ? date.getUTCDate()
                    : "0" + date.getUTCDate()) +
                "/" +
                (date.getUTCMonth() > 8
                    ? date.getUTCMonth() + 1
                    : "0" + (date.getUTCMonth() + 1)) +
                "/" +
                date.getUTCFullYear() +
                " " +
                date.getUTCHours() +
                ":" +
                `${
                    date.getUTCMinutes() > 10
                        ? `0${date.getUTCMinutes()}`
                        : date.getUTCMinutes()
                }`;
        }
        return result;
    }

    const user = await getUserById(params.userId);

    const workbook = new ExcelJs.Workbook();

    const path = __dirname;
    const filename = resolve(
        path,
        "../..",
        "template/ServiceDeskMBFDT_TemplateReport.xlsx"
    );
    try {
        await workbook.xlsx.readFile(`${filename}`);
    } catch (e) {
        const err = e as unknown as ParseSyntaxError;
        throw new HttpError(
            error.invalidData({
                location: "__dirname",
                param: err.type,
                message: err.message + "   " + filename,
                value: err.value,
            })
        );
    }

    const sheet = workbook.getWorksheet("All incident");

    const key: { key: string; width: number }[] = [
        { key: "stt", width: 4 },
        { key: "code", width: 15 },
        { key: "name", width: 25 },
        { key: "requester", width: 25 },
        { key: "description", width: 40 },
        { key: "email", width: 35 },
        { key: "department", width: 30 },
        { key: "created_time", width: 15 },
        { key: "creator", width: 20 },
        { key: "status", width: 10 },
        { key: "type", width: 20 },
        { key: "channel", width: 15 },
        { key: "group", width: 25 },
        { key: "technician", width: 20 },
        { key: "impact", width: 20 },
        { key: "urgency", width: 20 },
        { key: "priority", width: 15 },
        { key: "service", width: 15 },
        { key: "sub_service", width: 15 },
        { key: "overdue_time", width: 15 },
        { key: "sla", width: 20 },
        { key: "time_limit_response", width: 20 },
        { key: "time_limit_resolving", width: 20 },
        { key: "overdue_time_response", width: 15 },
        { key: "overdue_time_resolving", width: 15 },
        { key: "closed_time", width: 15 },
        // { key: "is_overdue_response", width: 20 },
        // { key: "is_overdue_resolving", width: 20 },
    ];
    sheet.columns = key;
    interface Row {
        stt: string;
        code: string;
        name: string;
        requester: string;
        description: string;
        email: string;
        department: string;
        created_time: string;
        creator?: string;
        status?: string;
        type?: string;
        channel?: string;
        group?: string;
        technician?: string;
        impact?: string;
        urgency?: string;
        priority?: string;
        service?: string;
        sub_service?: string;
        overdue_time: string;
        closed_time: string;
        sla?: string;
        time_limit_response?: string;
        time_limit_resolving?: string;
        overdue_time_response?: string;
        overdue_time_resolving?: string;
        is_overdue_response?: string;
        is_overdue_resolving?: string;
    }
    const rows: Row[] = [];

    let i = 1;
    for (const ticket of params.tickets) {
        if (!ticket) continue;
        const {
            number,
            name,
            requester,
            description,
            created_time,
            status,
            type,
            channel,
            group,
            technician,
            impact,
            urgency,
            priority,
            service,
            sub_service,
            overdue_time,
            closed_time,
            creator,
            sla,
        } = ticket;
        const showDescription = getContentHTML(description);
        const techName = technician
            ? `${technician.fullname} (${technician.email})`
            : "";
        const row: Row = {
            stt: String(i),
            code: number,
            name: name,
            requester: requester.fullname,
            description: `${showDescription}`,
            email: requester.email,
            department: requester.department ? requester.department.name : "",
            created_time: `${
                typeof created_time === "string"
                    ? toFormat(new Date(created_time))
                    : toFormat(created_time)
            }`,
            creator: creator && creator.fullname ? creator.fullname : "",
            status: status ? status.name : "",
            type: type ? type.name : "",
            channel: channel ? channel.name : "",
            group: group ? group.name : "",
            technician: technician ? technician.fullname : "",
            impact: impact ? impact.name : "",
            urgency: urgency ? urgency.name : "",
            priority: priority ? priority.name : "",
            service: service ? service.name : "",
            sub_service: sub_service ? sub_service.name : "",
            overdue_time: `${
                typeof overdue_time === "string"
                    ? toFormat(new Date(overdue_time))
                    : toFormat(overdue_time)
            }`,
            sla: sla ? sla.name : "",
            time_limit_response:
                sla && sla.response_assurance?.actual_time
                    ? `${
                          typeof sla.response_assurance?.actual_time ===
                          "string"
                              ? toFormat(
                                    new Date(
                                        sla.response_assurance?.actual_time
                                    )
                                )
                              : toFormat(sla.response_assurance?.actual_time)
                      }`
                    : "",
            time_limit_resolving:
                sla && sla.resolving_assurance?.actual_time
                    ? `${
                          typeof sla.resolving_assurance?.actual_time ===
                          "string"
                              ? toFormat(
                                    new Date(
                                        sla.resolving_assurance?.actual_time
                                    )
                                )
                              : toFormat(sla.resolving_assurance?.actual_time)
                      }`
                    : "",
            overdue_time_response:
                sla && sla.response_assurance?.overdue_time
                    ? `${
                          typeof sla.response_assurance?.overdue_time ===
                          "string"
                              ? toFormat(
                                    new Date(
                                        sla.response_assurance?.overdue_time
                                    )
                                )
                              : toFormat(sla.response_assurance?.overdue_time)
                      }`
                    : "",
            overdue_time_resolving:
                sla && sla.resolving_assurance?.overdue_time
                    ? `${
                          typeof sla.resolving_assurance?.overdue_time ===
                          "string"
                              ? toFormat(
                                    new Date(
                                        sla.resolving_assurance?.overdue_time
                                    )
                                )
                              : toFormat(sla.resolving_assurance?.overdue_time)
                      }`
                    : "",
            closed_time: `${
                typeof closed_time === "string"
                    ? toFormat(new Date(closed_time))
                    : toFormat(closed_time)
            }`,
            // is_overdue_response:
            //     sla && sla.response_assurance
            //         ? `${
            //               sla.response_assurance.is_overdue === true
            //                   ? "Đúng hạn"
            //                   : "Trễ hạn"
            //           }`
            //         : "",
            // is_overdue_resolving:
            //     sla && sla.resolving_assurance
            //         ? `${
            //               sla.resolving_assurance.is_overdue === true
            //                   ? "Đúng hạn"
            //                   : "Trễ hạn"
            //           }`
            //         : "",
        };
        i++;
        rows.push(row);
    }
    sheet.getRow(4).getCell(2).value = `Kỳ báo cáo: từ ${toFormat(
        params.start
    )} đến ${toFormat(params.end)}`;
    sheet.getRow(5).getCell(2).value = `Thời gian xuất báo cáo: ${toFormat(
        new Date()
    )}`;
    sheet
        .getRow(6)
        .getCell(
            2
        ).value = `Người xuất báo cáo:  ${user.body?.fullname} (${user.body?.email})`;
    sheet.insertRows(10, rows, "i+");
    sheet.spliceRows(9, 1);
    return workbook;
}

function getContentHTML(htmlString: string): string {
    // Sử dụng cheerio để phân tích chuỗi HTML
    const $ = cheerio.load(htmlString);
    // Lấy nội dung trong thẻ <p>
    const elements: {
        tag: string; // Lưu lại tên của thẻ (h1, p, h3, ...)
        content: any;
    }[] = [];
    let content: string = "";
    $("h1, h2, h3, h4, h5, h6, p, a").each(
        (index: number, element: Element) => {
            elements.push({
                tag: element.tagName, // Lưu lại tên của thẻ (h1, p, h3, ...)
                content: $(element).text(), // Lưu lại nội dung của thẻ
            });
        }
    );
    elements.forEach((element) => {
        console.log(
            "🚀 ~ file: pdf.controller.ts:766 ~ elements.forEach ~ element:",
            element
        );
        const content_e = element.content;
        if (content_e && content_e !== "\n") {
            content += content_e + "\n";
        }
    });
    // Lấy nội dung trong thẻ <img> và thuộc tính src
    const imgTag = $("img");
    let fileName = "";
    imgTag.each((index: number, element: Element) => {
        const imgSrc = $(element).attr("src");
        if (imgSrc) {
            fileName += imgSrc.split("/").pop()?.split("?").shift() + "\n";
        }
    });
    // Lấy nội dung trong các ô của bảng
    const tableCells = $("table td");
    const tableColumns = $("table tr");
    let contentTb: string = "";
    const columns = tableCells.length / tableColumns.length;
    tableColumns.each((i: number, e: Element) => {
        tableCells.each((index: number, element: Element) => {
            const content = $(element).text();
            if (columns * i <= index && index < columns * (1 + i)) {
                contentTb += content + "\t";
            }
        });
        contentTb += "\n";
    });
    let result = "";
    if (content) {
        result += content;
    }
    if (fileName) {
        result += "Hình ảnh \n" + fileName;
    }
    if (contentTb) {
        result += contentTb;
    }
    return result;
}
