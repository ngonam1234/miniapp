import express, { NextFunction, Request, Response } from "express";
import {
    createLinkUpload,
    getLinkDownload,
} from "../../controllers/file.controller";
import { getLinkValidator } from "../../validator";
export const router = express.Router();

router.post(
    "/download-links",
    getLinkValidator(),
    async (req: Request, _: Response, next: NextFunction) => {
        const objectNames: string[] = req.body;
        const result = await getLinkDownload(objectNames);
        next(result);
    }
);

router.get(
    "/upload-link-base64/:fileName",
    async (req: Request, _: Response, next: NextFunction) => {
        const fileName = req.params.fileName as string;
        const tenant = req.query.tenant as string;
        const type = req.query.type as string;
        const userId = req.query.userId as string;
        const result = await createLinkUpload(fileName, type, tenant, userId);
        next(result);
    }
);
