import mongoose from "mongoose";
import { ITemplate, TypeEnum } from "../interfaces/models";

export const layoutItemSchema = new mongoose.Schema(
    {
        required: {
            type: Boolean,
            required: true,
        },
        field: {
            type: String,
            required: true,
        },
        default: {
            type: String,
            required: false,
        },
    },
    {
        _id: false,
        versionKey: false,
    }
);

export const templateSchema = new mongoose.Schema(
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
            default: TypeEnum.DEFAULT,
        },
        description: {
            type: String,
            required: true,
        },
        default_name: {
            type: String,
            required: false,
        },
        default_description: {
            type: String,
            required: false,
        },
        default_requester: {
            type: String,
            required: false,
        },
        workflow: {
            type: String,
            required: false,
        },
        tenant: {
            type: String,
            required: false,
        },
        technician_layout: [layoutItemSchema],
        enduser_layout: [layoutItemSchema],
        created_by: {
            type: String,
            required: true,
        },
        updated_by: {
            type: String,
            required: false,
        },
        created_time: {
            type: Date,
            required: true,
        },
        updated_time: {
            type: Date,
            required: false,
        },
        is_active: {
            type: Boolean,
            required: true,
            default: true,
        },
        has_enduser_layout: {
            type: Boolean,
            required: true,
            default: true,
        },
    },
    {
        versionKey: false,
    }
);

const Template = mongoose.model<ITemplate>("Template", templateSchema);
export default Template;
