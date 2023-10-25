import { Router } from "express";
import { configs } from "../configs";
import { verifyToken } from "../middlewares";

import { router as statusRouter } from "./external/status.router";
import { router as typeRouter } from "./external/type.router";
import { router as priorityRouter } from "./external/priority.router";
import { router as urgencyRouter } from "./external/urgency.router";
import { router as impactRouter } from "./external/impact.router";
import { router as workflowRouter } from "./external/workflow.router";
import { router as templateRouter } from "./external/template.router";
import { router as channelRouter } from "./external/channel.router";
import { router as ticketRouter } from "./external/ticket.router";
import { router as templateFieldRouter } from "./external/template-field.router";
import { router as taskRouter } from "./external/task.router";
import { router as taskTypeRouter } from "./external/task-type.router";
import { router as connectRouter } from "./external/connect.router";
import { router as priorityMatrixRouter } from "./external/priority-matrix.router";
import { router as dataSourceRouter } from "./external/data-source.router";

import { router as inTicketRouter } from "./internal/ticket.router";
import { router as inChannelRouter } from "./internal/channel.router";
import { router as inPriorityRouter } from "./internal/priority.router";
import { router as inImpactRouter } from "./internal/impact.router";
import { router as inTypeRouter } from "./internal/type.router";
import { router as inUrgencyRouter } from "./internal/urgency.router";
import { router as inTaskTypeRouter } from "./internal/task-type.router";
import { router as inConnectRouter } from "./internal/connect.router";
export const router: Router = Router();

const exPrefix = `${configs.app.prefix}/incident`;
const inPrefix = `${configs.app.prefix}/in/incident`;

router.use(`${exPrefix}/status`, verifyToken, statusRouter);
router.use(`${exPrefix}/types`, verifyToken, typeRouter);
router.use(`${exPrefix}/channels`, verifyToken, channelRouter);
router.use(`${exPrefix}/impacts`, verifyToken, impactRouter);
router.use(`${exPrefix}/priorities`, verifyToken, priorityRouter);
router.use(`${exPrefix}/urgencies`, verifyToken, urgencyRouter);
router.use(`${exPrefix}/workflows`, verifyToken, workflowRouter);
router.use(`${exPrefix}/templates`, verifyToken, templateRouter);
router.use(`${exPrefix}/template-fields`, verifyToken, templateFieldRouter);
router.use(`${exPrefix}/tickets`, verifyToken, ticketRouter);
router.use(`${exPrefix}/task-types`, verifyToken, taskTypeRouter);
router.use(`${exPrefix}/tasks`, verifyToken, taskRouter);
router.use(`${exPrefix}/connects`, verifyToken, connectRouter);
router.use(`${exPrefix}/priority-matrices`, verifyToken, priorityMatrixRouter);
router.use(`${exPrefix}/data-sources`, verifyToken, dataSourceRouter);

router.use(`${inPrefix}/tickets`, inTicketRouter);
router.use(`${inPrefix}/urgencies`, inUrgencyRouter);
router.use(`${inPrefix}/priorities`, inPriorityRouter);
router.use(`${inPrefix}/channels`, inChannelRouter);
router.use(`${inPrefix}/impacts`, inImpactRouter);
router.use(`${inPrefix}/types`, inTypeRouter);
router.use(`${inPrefix}/task-types`, inTaskTypeRouter);
router.use(`${inPrefix}/connects`, inConnectRouter);
