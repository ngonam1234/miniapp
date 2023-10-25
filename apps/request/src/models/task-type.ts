import mongoose from "mongoose";
import { ITaskType } from "../interfaces/models/task-type";

export const taskTypeSchema = new mongoose.Schema(
    {
        id: {
            type: String,
            required: true,
        },
        name: {
            type: String,
            required: true,
        },
        tenant: {
            type: String,
            required: true,
        },
        description: {
            type: String,
            required: false,
        },
        is_active: {
            type: Boolean,
            required: true,
        },
        is_deleted: {
            type: Boolean,
            required: false,
            default: false,
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

const TaskType = mongoose.model<ITaskType>("TaskType", taskTypeSchema);
export default TaskType;
