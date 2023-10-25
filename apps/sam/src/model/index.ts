import { Document, Types } from "mongoose";

export type document<T> = Document<unknown, unknown, T> &
    Omit<T & { _id: Types.ObjectId }, never>;

export * from "./sla";
