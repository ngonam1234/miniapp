import { IField, TypeEnum } from "./../interfaces/models";
import mongoose from "mongoose";

export const fieldSchema = new mongoose.Schema(
    {
        id: {
            type: String,
            required: true,
        },
        name: {
            type: String,
            required: false,
        },
        description: {
            type: String,
            required: false,
        },
        tenant: {
            type: String,
            required: false,
        },
        title: {
            type: String,
            required: true,
        },
        type: {
            type: String,
            required: false,
            enum: TypeEnum,
            default: TypeEnum.DEFAULT,
        },
        input_type: {
            type: String,
            required: true,
        },
        value_type: {
            type: String,
            required: true,
        },
        placeholder: {
            type: String,
            required: false,
        },
        is_active: {
            type: Boolean,
            required: false,
            default: true,
        },
        datasource: {
            type: {
                href: {
                    type: String,
                    required: false,
                },
                dependencies: [
                    {
                        type: String,
                        required: false,
                    },
                ],
            },
            required: false,
            _id: false,
        },
    },
    {
        versionKey: false,
    }
);

const Field = mongoose.model<IField>("Field", fieldSchema);
export default Field;
