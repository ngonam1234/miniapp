import mongoose from "mongoose";
import { IPriorityMatrix } from "../interfaces/models/priority-matrix";
const impactNPriority = new mongoose.Schema(
    {
        impact: {
            type: String,
            required: false,
        },
        priority: {
            type: String,
            required: false,
        },
        created_by: {
            type: String,
            required: false,
        },
        created_time: {
            type: Date,
            required: false,
        },
    },
    {
        versionKey: false,
        _id: false,
    }
);

export const priorityMatrixSchema = new mongoose.Schema(
    {
        id: {
            type: String,
            required: true,
        },
        tenant: {
            type: String,
            required: true,
        },
        urgency: {
            type: String,
            required: true,
        },
        impact_priority_list: {
            type: [impactNPriority],
            required: true,
        },
        is_deleted: {
            type: Boolean,
            required: false,
            default: false,
        },
    },
    {
        versionKey: false,
    }
);

const PriorityMatrix = mongoose.model<IPriorityMatrix>(
    "PriorityMatrix",
    priorityMatrixSchema
);
export default PriorityMatrix;
