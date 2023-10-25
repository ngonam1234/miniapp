import mongoose from "mongoose";
import { IType } from "../interfaces/models";
import peopleSchema from "../interfaces/models/people";

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
            enum: ["DEFAULT", "CUSTOM"],
            default: "CUSTOM",
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
        created_by: {
            type: peopleSchema,
            required: false,
        },
        updated_by: {
            type: peopleSchema,
            required: false,
        },
    },
    {
        versionKey: false,
    }
);

const Type = mongoose.model<IType>("Type", typeSchema);
export default Type;
