import mongoose from "mongoose";
import { IType, TypeEnum } from "../interfaces/models";

const typeSchema = new mongoose.Schema(
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

const Type = mongoose.model<IType>("Type", typeSchema);
export default Type;
