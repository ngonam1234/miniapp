import mongoose from "mongoose";
import { IChannel, TypeEnum } from "../interfaces/models";

const channelSchema = new mongoose.Schema(
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
            required: true,
        },
        created_time: {
            type: Date,
            required: true,
            default: new Date(),
        },
        updated_time: {
            type: Date,
            required: false,
        },
        updated_by: {
            type: String,
            required: false,
        },
    },
    {
        versionKey: false,
    }
);

const Channel = mongoose.model<IChannel>("Channel", channelSchema);
export default Channel;
