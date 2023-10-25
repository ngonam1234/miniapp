import fs from "fs";
import { resolve } from "path";
import PdfPrinter from "pdfmake";
import { TDocumentDefinitions } from "pdfmake/interfaces";
import { ITicket } from "../interfaces/models";
import { getUserById } from "../service";
import { Element } from "cheerio";
const cheerio = require("cheerio");

export async function exportSLAPdf(params: {
    sla?: boolean;
    userId: string;
    start: Date;
    end: Date;
    tickets: ITicket[];
}): Promise<Buffer> {
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
    const path = __dirname;
    const filename = resolve(path, "../..", "fonts");
    const user = await getUserById(params.userId);
    const fonts = {
        Roboto: {
            normal: filename + "/Roboto/Roboto-Regular.ttf",
            bold: filename + "/Roboto/Roboto-Medium.ttf",
            italics: filename + "/Roboto/Roboto-Italic.ttf",
            bolditalics: filename + "/Roboto/Roboto-MediumItalic.ttf",
        },
    };

    const printer = new PdfPrinter(fonts);

    const columns = [
        { text: "STT", style: "column" },
        { text: "Mã yêu cầu", style: "column" },
        { text: "Tên yêu cầu", style: "column" },
        { text: "Người yêu cầu", style: "column" },
        { text: "Mô tả", style: "column" },
        { text: "Email người yêu cầu", style: "column" },
        { text: "Phòng ban người yêu cầu", style: "column" },
        { text: "Ngày tạo yêu cầu", style: "column" },
        { text: "Người tạo yêu cầu", style: "column" },
        { text: "Trạng thái", style: "column" },
        { text: "Loại yêu cầu", style: "column" },
        { text: "Kênh tiếp nhận", style: "column" },
        { text: "Nhóm hỗ trợ", style: "column" },
        { text: "Cán bộ xử lý", style: "column" },
        { text: "Mức độ ưu tiên", style: "column" },
        { text: "Dịch vụ", style: "column" },
        { text: "Dịch vụ con", style: "column" },
        { text: "Hạn hoàn thành", style: "column" },
        { text: "Tên Cam kết chất lượng dịch vụ (SLA)", style: "column" },
        {
            text: "Hạn phản hồi Cam kết chất lượng dịch vụ (SLA)",
            style: "column",
        },
        { text: "Hạn xử lý Cam kết chất lượng dịch vụ (SLA)", style: "column" },
        { text: "Ngày phản hồi thực tế", style: "column" },
        { text: "Ngày xử lý thực tế", style: "column" },
        { text: "Ngày đóng yêu cầu", style: "column" },
        // {
        //     text: "Đúng/Trễ hạn phản hồi Cam `kết chất lượng dịch vụ (SLA)",
        //     style: "column",
        // },

        // {
        //     text: "Đúng/Trễ hạn xử lý Cam kết chất lượng dịch vụ (SLA)",
        //     style: "column",
        // },
    ];

    const rows: object[][] = [];
    let i = 1;
    for (const ticket of params.tickets) {
        const {
            number,
            name,
            requester,
            creator,
            created_time,
            description,
            status,
            type,
            channel,
            group,
            technician,
            priority,
            service,
            sub_service,
            overdue_time,
            closed_time,
            sla,
        } = ticket;
        const techName = technician
            ? `${technician.fullname} (${technician.email})`
            : "";
        const row = [
            { text: `${String(i)}`, style: "row" },
            { text: `${number}`, style: "row" },
            { text: `${name}`, style: "row" },
            { text: `${requester.fullname}`, style: "row" },
            { text: `${getContentHTML(description)}`, style: "row" },
            { text: `${requester.email}`, style: "row" },
            {
                text: `${
                    requester.department?.name !== undefined
                        ? requester.department.name
                        : ""
                }`,
                style: "row",
            },
            {
                text: `${
                    typeof created_time === "string"
                        ? toFormat(new Date(created_time))
                        : toFormat(created_time)
                }`,
                style: "row",
            },
            { text: `${creator.fullname}`, style: "row" },
            {
                text: `${status?.name !== undefined ? status.name : ""}`,
                style: "row",
            },
            {
                text: `${type?.name !== undefined ? type.name : ""}`,
                style: "row",
            },
            {
                text: `${channel?.name !== undefined ? channel.name : ""}`,
                style: "row",
            },
            {
                text: `${group?.name !== undefined ? group.name : ""}`,
                style: "row",
            },
            { text: `${techName}`, style: "row" },
            {
                text: `${priority?.name !== undefined ? priority.name : ""}`,
                style: "row",
            },
            {
                text: `${service?.name !== undefined ? service.name : ""}`,
                style: "row",
            },
            {
                text: `${
                    sub_service?.name !== undefined ? sub_service.name : ""
                }`,
                style: "row",
            },
            {
                text: `${
                    typeof overdue_time === "string"
                        ? toFormat(new Date(overdue_time))
                        : toFormat(overdue_time)
                }`,
                style: "row",
            },
            { text: ` ${sla ? sla?.name : ""}`, style: "row" },
            {
                text:
                    sla && sla.response_assurance?.overdue_time
                        ? `${
                              typeof sla.response_assurance?.overdue_time ===
                              "string"
                                  ? toFormat(
                                        new Date(
                                            sla.response_assurance?.overdue_time
                                        )
                                    )
                                  : toFormat(
                                        sla.response_assurance?.overdue_time
                                    )
                          }`
                        : "",
                style: "row",
            },
            {
                text:
                    sla && sla.resolving_assurance?.overdue_time
                        ? `${
                              typeof sla.resolving_assurance?.overdue_time ===
                              "string"
                                  ? toFormat(
                                        new Date(
                                            sla.resolving_assurance?.overdue_time
                                        )
                                    )
                                  : toFormat(
                                        sla.resolving_assurance?.overdue_time
                                    )
                          }`
                        : "",
                style: "row",
            },
            {
                text:
                    sla && sla.response_assurance?.actual_time
                        ? `${
                              typeof sla.response_assurance?.actual_time ===
                              "string"
                                  ? toFormat(
                                        new Date(
                                            sla.response_assurance?.actual_time
                                        )
                                    )
                                  : toFormat(
                                        sla.response_assurance?.actual_time
                                    )
                          }`
                        : "",
                style: "row",
            },
            {
                text:
                    sla && sla.resolving_assurance?.actual_time
                        ? `${
                              typeof sla.resolving_assurance?.actual_time ===
                              "string"
                                  ? toFormat(
                                        new Date(
                                            sla.resolving_assurance?.actual_time
                                        )
                                    )
                                  : toFormat(
                                        sla.resolving_assurance?.actual_time
                                    )
                          }`
                        : "",
                style: "row",
            },
            {
                text: `${
                    typeof closed_time === "string"
                        ? toFormat(new Date(closed_time))
                        : toFormat(closed_time)
                }`,
                style: "row",
            },
            // {
            //     text:
            //         sla && sla.response_assurance
            //             ? `${
            //                   sla.response_assurance.is_overdue === false
            //                       ? "Đúng hạn"
            //                       : "Trễ hạn"
            //               }`
            //             : "",
            //     style: "row",
            // },
            // {
            //     text:
            //         sla && sla.resolving_assurance
            //             ? `${
            //                   sla.resolving_assurance.is_overdue === false
            //                       ? "Đúng hạn"
            //                       : "Trễ hạn"
            //               }`
            //             : "",
            //     style: "row",
            // },
        ];
        i++;
        rows.push(row);
    }

    let headerContent;

    if (params.sla !== undefined) {
        headerContent =
            "BÁO CÁO CAM KẾT CHẤT LƯỢNG DỊCH VỤ (SLA) YÊU CẦU HỖ TRỢ";
    } else {
        headerContent = "BÁO CÁO YÊU CẦU HỖ TRỢ";
    }

    const header = [
        {
            text: headerContent,
            style: "header",
        },
        {
            text: `Kỳ báo cáo: từ ${toFormat(params.start)} đến ${toFormat(
                params.end
            )}`,
            style: "subheader",
        },
        {
            text: `Thời gian xuất báo cáo: ${toFormat(new Date())}`,
            style: "subheader",
        },
        {
            text: `Người xuất báo cáo:  ${user.body?.fullname} (${user.body?.email})`,
            style: "subheader",
        },
    ];

    const docDefinition: TDocumentDefinitions = {
        content: [
            ...header,
            {
                style: "table",
                table: {
                    widths: [
                        20, 50, 45, 60, 150, 130, 90, 90, 90, 60, 70, 60, 80,
                        65, 75, 50, 50, 60, 120, 120, 120, 70, 50, 80, 120, 120,
                    ],
                    body: [columns, ...rows],
                    dontBreakRows: true,
                },
            },
        ],
        styles: {
            header: {
                fontSize: 20,
                bold: true,
                margin: [0, 0, 0, 10],
                color: "#4472C4",
                font: "Roboto",
            },
            subheader: {
                fontSize: 11,
                bold: true,
                margin: [0, 0, 0, 0],
            },
            table: {
                margin: [0, 20, 0, 15],
            },
            column: {
                fontSize: 9,
                font: "Roboto",
                bold: true,
            },
            row: {
                fontSize: 9,
                font: "Roboto",
            },
        },
        pageOrientation: "landscape",
        pageSize: "A1",
    };
    const fileTemplate = resolve(
        __dirname,
        "../..",
        "template/ServiceDeskMBFDT_TemplateReport.pdf"
    );
    return new Promise((resolve) => {
        const pdfDoc = printer.createPdfKitDocument(docDefinition);
        const chunks: Buffer[] = [];

        pdfDoc.on("data", (chunk) => {
            chunks.push(chunk);
        });

        pdfDoc.on("end", () => {
            const pdfBuffer = Buffer.concat(chunks);
            resolve(pdfBuffer);
        });

        pdfDoc.end();
    });
}

export async function exportPdf(params: {
    userId: string;
    start: Date;
    end: Date;
    tickets: ITicket[];
}): Promise<Buffer> {
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
    const path = __dirname;
    const filename = resolve(path, "../..", "fonts");
    const user = await getUserById(params.userId);
    const fonts = {
        Roboto: {
            normal: filename + "/Roboto/Roboto-Regular.ttf",
            bold: filename + "/Roboto/Roboto-Medium.ttf",
            italics: filename + "/Roboto/Roboto-Italic.ttf",
            bolditalics: filename + "/Roboto/Roboto-MediumItalic.ttf",
        },
    };

    const printer = new PdfPrinter(fonts);

    const columns = [
        { text: "STT", style: "column" },
        { text: "Mã yêu cầu", style: "column" },
        { text: "Tên yêu cầu", style: "column" },
        { text: "Người yêu cầu", style: "column" },
        { text: "Email người yêu cầu", style: "column" },
        { text: "Phòng ban người yêu cầu", style: "column" },
        { text: "Ngày tạo yêu cầu", style: "column" },
        { text: "Người tạo yêu cầu", style: "column" },
        { text: "Trạng thái", style: "column" },
        { text: "Loại yêu cầu", style: "column" },
        { text: "Kênh tiếp nhận", style: "column" },
        { text: "Nhóm hỗ trợ", style: "column" },
        { text: "Cán bộ xử lý", style: "column" },
        { text: "Mức độ ưu tiên", style: "column" },
        { text: "Dịch vụ", style: "column" },
        { text: "Dịch vụ con", style: "column" },
        { text: "Hạn hoàn thành", style: "column" },
        { text: "Tên Cam kết chất lượng dịch vụ (SLA)", style: "column" },
        {
            text: "Hạn phản hồi Cam kết chất lượng dịch vụ (SLA)",
            style: "column",
        },
        { text: "Hạn xử lý Cam kết chất lượng dịch vụ (SLA)", style: "column" },
        { text: "Ngày phản hồi thực tế", style: "column" },
        { text: "Ngày xử lý thực tế", style: "column" },
        { text: "Ngày đóng yêu cầu", style: "column" },
        // {
        //     text: "Đúng/Trễ hạn phản hồi Cam `kết chất lượng dịch vụ (SLA)",
        //     style: "column",
        // },

        // {
        //     text: "Đúng/Trễ hạn xử lý Cam kết chất lượng dịch vụ (SLA)",
        //     style: "column",
        // },
    ];

    const rows: object[][] = [];
    let i = 1;
    for (const ticket of params.tickets) {
        if (!ticket) continue;
        const {
            number,
            name,
            requester,
            description,
            creator,
            created_time,
            status,
            type,
            channel,
            group,
            technician,
            priority,
            service,
            sub_service,
            overdue_time,
            closed_time,
            sla,
        } = ticket;
        const techName = technician
            ? `${technician.fullname} (${technician.email})`
            : "";
        const row = [
            { text: `${String(i)}`, style: "row" },
            { text: `${number}`, style: "row" },
            { text: `${name}`, style: "row" },
            { text: `${requester.fullname}`, style: "row" },
            { text: `${getContentHTML(description)}`, style: "row" },
            { text: `${requester.email}`, style: "row" },
            {
                text: `${
                    requester.department?.name !== undefined
                        ? requester.department.name
                        : ""
                }`,
                style: "row",
            },
            {
                text: `${
                    typeof created_time === "string"
                        ? toFormat(new Date(created_time))
                        : toFormat(created_time)
                }`,
                style: "row",
            },
            { text: `${creator.fullname}`, style: "row" },
            {
                text: `${status?.name !== undefined ? status.name : ""}`,
                style: "row",
            },
            {
                text: `${type?.name !== undefined ? type.name : ""}`,
                style: "row",
            },
            {
                text: `${channel?.name !== undefined ? channel.name : ""}`,
                style: "row",
            },
            {
                text: `${group?.name !== undefined ? group.name : ""}`,
                style: "row",
            },
            { text: `${techName}`, style: "row" },
            {
                text: `${priority?.name !== undefined ? priority.name : ""}`,
                style: "row",
            },
            {
                text: `${service?.name !== undefined ? service.name : ""}`,
                style: "row",
            },
            {
                text: `${
                    sub_service?.name !== undefined ? sub_service.name : ""
                }`,
                style: "row",
            },
            {
                text: `${
                    typeof overdue_time === "string"
                        ? toFormat(new Date(overdue_time))
                        : toFormat(overdue_time)
                }`,
                style: "row",
            },
            { text: ` ${sla ? sla?.name : ""}`, style: "row" },
            {
                text:
                    sla && sla.response_assurance?.actual_time
                        ? `${
                              typeof sla.response_assurance?.actual_time ===
                              "string"
                                  ? toFormat(
                                        new Date(
                                            sla.response_assurance?.actual_time
                                        )
                                    )
                                  : toFormat(
                                        sla.response_assurance?.actual_time
                                    )
                          }`
                        : "",
                style: "row",
            },
            {
                text:
                    sla && sla.resolving_assurance?.actual_time
                        ? `${
                              typeof sla.resolving_assurance?.actual_time ===
                              "string"
                                  ? toFormat(
                                        new Date(
                                            sla.resolving_assurance?.actual_time
                                        )
                                    )
                                  : toFormat(
                                        sla.resolving_assurance?.actual_time
                                    )
                          }`
                        : "",
                style: "row",
            },
            {
                text:
                    sla && sla.response_assurance?.overdue_time
                        ? `${
                              typeof sla.response_assurance?.overdue_time ===
                              "string"
                                  ? toFormat(
                                        new Date(
                                            sla.response_assurance?.overdue_time
                                        )
                                    )
                                  : toFormat(
                                        sla.response_assurance?.overdue_time
                                    )
                          }`
                        : "",
                style: "row",
            },
            {
                text:
                    sla && sla.resolving_assurance?.overdue_time
                        ? `${
                              typeof sla.resolving_assurance?.overdue_time ===
                              "string"
                                  ? toFormat(
                                        new Date(
                                            sla.resolving_assurance?.overdue_time
                                        )
                                    )
                                  : toFormat(
                                        sla.resolving_assurance?.overdue_time
                                    )
                          }`
                        : "",
                style: "row",
            },
            {
                text: `${
                    typeof closed_time === "string"
                        ? toFormat(new Date(closed_time))
                        : toFormat(closed_time)
                }`,
                style: "row",
            },
            // {
            //     text:
            //         sla && sla.response_assurance
            //             ? `${
            //                   sla.response_assurance.is_overdue === true
            //                       ? "Đúng hạn"
            //                       : "Trễ hạn"
            //               }`
            //             : "",
            //     style: "row",
            // },
            // {
            //     text:
            //         sla && sla.resolving_assurance
            //             ? `${
            //                   sla.resolving_assurance.is_overdue === true
            //                       ? "Đúng hạn"
            //                       : "Trễ hạn"
            //               }`
            //             : "",
            //     style: "row",
            // },
        ];
        i++;
        rows.push(row);
    }
    const header = [
        { text: "BÁO CÁO YÊU CẦU HỖ TRỢ", style: "header" },
        {
            text: `Kỳ báo cáo: từ ${toFormat(params.start)} đến ${toFormat(
                params.end
            )}`,
            style: "subheader",
        },
        {
            text: `Thời gian xuất báo cáo: ${toFormat(new Date())}`,
            style: "subheader",
        },
        {
            text: `Người xuất báo cáo:  ${user.body?.fullname} (${user.body?.email})`,
            style: "subheader",
        },
    ];

    const docDefinition: TDocumentDefinitions = {
        content: [
            ...header,
            {
                style: "table",
                table: {
                    widths: [
                        20, 50, 45, 60, 150, 130, 90, 90, 90, 60, 70, 60, 80,
                        65, 75, 50, 50, 60, 120, 120, 120, 70, 50, 80, 120, 120,
                    ],
                    body: [columns, ...rows],
                    dontBreakRows: true,
                },
            },
        ],
        styles: {
            header: {
                fontSize: 20,
                bold: true,
                margin: [0, 0, 0, 10],
                color: "#4472C4",
                font: "Roboto",
            },
            subheader: {
                fontSize: 11,
                bold: true,
                margin: [0, 0, 0, 0],
            },
            table: {
                margin: [0, 20, 0, 15],
            },
            column: {
                fontSize: 9,
                font: "Roboto",
                bold: true,
            },
            row: {
                fontSize: 9,
                font: "Roboto",
            },
        },
        pageOrientation: "landscape",
        pageSize: "A1",
    };
    const fileTemplate = resolve(
        __dirname,
        "../..",
        "template/ServiceDeskMBFDT_TemplateReport.pdf"
    );
    return new Promise((resolve, _) => {
        const pdfDoc = printer.createPdfKitDocument(docDefinition);
        const writeStream = fs.createWriteStream(fileTemplate);
        pdfDoc.pipe(writeStream);

        writeStream.on("finish", () => {
            // Tiến hành đọc tệp tin
            const data = fs.readFileSync(fileTemplate);
            resolve(data); // Trả về dữ liệu qua Promise khi quá trình đọc hoàn thành
        });

        pdfDoc.end();
    });
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
