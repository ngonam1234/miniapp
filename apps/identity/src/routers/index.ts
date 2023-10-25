import { Router } from "express";
import { configs } from "../configs";
import { router as identityRouter } from "./identity.router";

export const router: Router = Router();

router.use(`${configs.app.prefix}/in/identities`, identityRouter);
