import mongoose from "mongoose";
import { IDepartment } from "../interfaces/models/department";

export const subDepartment = new mongoose.Schema(
    {
        id: {
            type: String,
            required: true,
        },
        name: {
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
            require: false,
            default: false,
        },
    },
    {
        versionKey: false,
    }
);
const departmentSchema = new mongoose.Schema(
    {
        id: {
            type: String,
            required: true,
        },
        name: {
            type: String,
            required: true,
        },
        description: {
            type: String,
            required: false,
        },
        manager: {
            type: String,
            required: false,
        },
        approver: {
            type: String,
            required: false,
        },
        pic: {
            type: String,
            required: false,
        },
        tenant: {
            type: String,
            required: true,
        },
        sub_departments: [
            {
                type: subDepartment,
                required: false,
            },
        ],
        is_active: {
            type: Boolean,
            required: true,
        },
        is_deleted: {
            type: Boolean,
            required: false,
        },
        updated_time: {
            type: Date,
            required: false,
        },
        updated_by: {
            type: String,
            required: false,
        },
        created_time: {
            type: Date,
            required: false,
        },

        members: [
            {
                type: String,
                required: false,
            },
        ],
    },
    {
        versionKey: false,
    }
);

const Department = mongoose.model<IDepartment>("Department", departmentSchema);
export default Department;
