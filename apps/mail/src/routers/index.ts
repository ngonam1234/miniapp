import { Router } from "express";
import { configs } from "../configs";
import { router as mailRouter } from "./mail.router";

export const router: Router = Router();

router.use(`${configs.app.prefix}/in/mail`, mailRouter);
