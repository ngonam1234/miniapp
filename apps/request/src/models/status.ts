import mongoose from "mongoose";
import { IStatus, TypeEnum } from "../interfaces/models";

export const statusSchema = new mongoose.Schema(
    {
        id: {
            type: String,
            required: true,
        },
        name: {
            type: String,
            required: true,
        },
        type: {
            type: String,
            required: false,
            enum: TypeEnum,
            default: TypeEnum.CUSTOM,
        },
        description: {
            type: String,
            required: false,
        },
        count_time: {
            type: Boolean,
            required: true,
        },
        is_active: {
            type: Boolean,
            required: false,
            default: true,
        },
        is_deleted: {
            type: Boolean,
            required: false,
            default: false,
        },
        tenant: {
            type: String,
            required: false,
        },
        created_time: {
            type: Date,
            required: true,
        },
    },
    {
        versionKey: false,
    }
);

const Status = mongoose.model<IStatus>("Status", statusSchema);
export default Status;
