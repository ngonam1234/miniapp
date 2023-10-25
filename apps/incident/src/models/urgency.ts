import mongoose from "mongoose";
import { IUrgency } from "../interfaces/models";
import peopleSchema from "../interfaces/models/people";

const urgencySchema = new mongoose.Schema(
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

const Urgency = mongoose.model<IUrgency>("Urgency", urgencySchema);
export default Urgency;
