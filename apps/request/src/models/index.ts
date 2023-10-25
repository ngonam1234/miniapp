import Status from "./status";
import Priority from "./priority";
import Type from "./type";
import Workflow from "./workflow";
import Ticket from "./ticket";
import Field from "./field";
import Template from "./template";
import Channel from "./channel";
import { Document, Types } from "mongoose";
import ActiveTemplate from "./active-template";
import Task from "./task";

export {
    Status,
    Priority,
    Type,
    Workflow,
    Ticket,
    Field,
    Template,
    Channel,
    ActiveTemplate,
    Task,
};

export type document<T> = Document<unknown, unknown, T> &
    Omit<T & { _id: Types.ObjectId }, never>;
