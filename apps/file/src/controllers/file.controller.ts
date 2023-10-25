import { error, HttpError, HttpStatus, Result, success } from "app";
import File from "../models/file";
import * as crypto from "crypto";
import * as Minio from "minio";
import { configs } from "../configs";
import { v1 } from "uuid";

function generateObjectName(): string {
    const randomString = crypto.randomBytes(8).toString("hex");
    return `${v1()}-${randomString}`;
}

const minioClient = new Minio.Client({
    endPoint: configs.minio.privateHost,
    port: Number(configs.minio.privatePort),
    useSSL: configs.minio.privateSsl === "true",
    accessKey: configs.minio.access,
    secretKey: configs.minio.secret,
});

const mimeMap = {
    "application/zip": ".zip",
    "application/xhtml+xml": ".xhtml",
    "application/vnd.visio": ".vsd",
    "image/svg+xml": ".svg",
    "application/vnd.ms-powerpoint": ".ppt",
    "application/x-httpd-php": ".php",
    "audio/mpeg": ".mp3",
    "video/mp4": ".mp4",
    "application/json": ".json",
    "image/gif": ".gif",
    "text/html": [".htm", ".html"],
    "text/csv": ".csv",
    "text/css": ".css",
    "text/plain": ".txt",
    "image/jpeg": [".jpeg", ".jpg"],
    "image/png": ".png",
    "application/java-archive": ".jar",
    "application/pdf": ".pdf",
    "application/vnd.ms-excel": ".xls",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
        ".xlsx",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        ".docx",
    "application/msword": ".doc",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation":
        ".pptx",
};

export async function createLinkUpload(
    filename: string,
    type: string,
    tenant: string,
    userId: string
): Promise<Result> {
    checkFileName(filename, type);
    const objectName = generateObjectName();
    const existingObject = await File.findOne({ object: objectName });
    if (existingObject) {
        return {
            status: HttpStatus.NOT_FOUND,
            code: "NOT_FOUND_OBJECT_FILE",
            errors: [
                {
                    location: "body",
                    param: "objectName",
                },
            ],
        };
    }

    const headerKey = "response-content-disposition";
    const headerValue = (filename: string): string =>
        `attachment; filename="${filename}"`;
    const uploadExpiredTime = Number(configs.minio.uploadExpiredTime);
    const downloadExpiredTime = Number(configs.minio.downloadExpiredTime);
    const [upload, download] = await Promise.all([
        minioClient.presignedPutObject(
            configs.minio.bucket,
            objectName,
            uploadExpiredTime
        ),
        minioClient.presignedGetObject(
            configs.minio.bucket,
            objectName,
            downloadExpiredTime,
            { [headerKey]: headerValue(filename) }
        ),
    ]);
    const file = new File({
        id: v1(),
        type,
        bucket: configs.minio.bucket,
        object: objectName,
        name: filename,
        uploaded_by: userId,
        tenant,
    });
    await file.save();
    return success.ok({
        object: objectName,
        download: getPublicURL(download),
        upload: getPublicURL(upload),
    });
}

export async function getLinkDownload(objectNames: string[]): Promise<Result> {
    const downloadExpiredTime = Number(configs.minio.downloadExpiredTime);
    const files = await File.find({ object: { $in: objectNames } });
    if (files.length != objectNames.length) {
        return {
            status: HttpStatus.NOT_FOUND,
            code: "NOT_FOUND_OBJECT_FILE",
            errors: [
                {
                    location: "body",
                    param: "objectName",
                },
            ],
        };
    }
    const headerKey = "response-content-disposition";
    const headerValue = (filename: string): string =>
        `attachment; filename="${filename}"`;
    const result = files.map((file) =>
        minioClient
            .presignedGetObject(
                configs.minio.bucket,
                file.object,
                downloadExpiredTime,
                { [headerKey]: headerValue(file.name) }
            )
            .then((res) => ({
                ...file.toJSON(),
                _id: undefined,
                link: getPublicURL(res),
            }))
    );
    return success.ok(await Promise.all(result));
}

function checkFileName(filename: string, type: string): void {
    const actualExt: string | undefined | string[] =
        mimeMap[<keyof typeof mimeMap>type];
    const dotIndex = filename.lastIndexOf(".");
    const ext = filename.substring(dotIndex).toLocaleLowerCase();

    const hasExt = Object.keys(mimeMap).find((k) => {
        const key = <keyof typeof mimeMap>k;
        return mimeMap[key] === ext || mimeMap[key].includes(ext);
    });

    const err = new HttpError(
        error.invalidData({
            location: "query|param",
            param: "type|filename",
            value: `${filename}|${type}`,
            description: {
                vi:
                    "Hệ thống chỉ hỗ trợ các định dạng file doc, " +
                    "docx, xlsx, xls, csv, mp3, mp4, png, jpeg, jpg, pdf, " +
                    "ppt, pptx, zip, rar. Vui lòng kiểm tra lại định " +
                    "dạng file đính kèm của bạn.",
                en:
                    "The system only supports file format doc, docx, xlsx, xls, csv, " +
                    "mp3, mp4, png, jpeg, jpg, pdf, ppt, pptx, zip, rar file " +
                    "formats. Please double check your attachment format.",
            },
        })
    );
    if (!actualExt || !hasExt) {
        throw err;
    }
    if (actualExt !== ext && !actualExt.includes(ext)) {
        throw err;
    }
}

function getPublicURL(privateUrl: string): string {
    const url = new URL(privateUrl);
    const { publicHost, publicPort, publicSsl } = configs.minio;
    publicPort != null && (url.port = publicPort);
    publicSsl == "true" && (url.protocol = "https:");
    publicHost && (url.host = publicHost);
    return url.toString();
}
