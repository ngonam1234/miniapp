import Status from "./status";
import Impact from "./impact";
import Priority from "./priority";
import Urgency from "./urgency";
import Type from "./type";
import Workflow from "./workflow";
import Ticket from "./ticket";
import Field from "./field";
import Template from "./template";
import Channel from "./channel";
import PriorityMatrix from "./priority-matrix";
import { Document, Types } from "mongoose";

export {
    Status,
    Impact,
    Priority,
    Urgency,
    Type,
    Workflow,
    Ticket,
    Field,
    Template,
    Channel,
    PriorityMatrix,
};

export type document<T> = Document<unknown, unknown, T> &
    Omit<T & { _id: Types.ObjectId }, never>;
