import mongoose from "mongoose";
import { ITenant as ITenant } from "../interfaces/models";

const tenantSchema = new mongoose.Schema(
    {
        id: {
            type: String,
            required: true,
        },
        code: {
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
        address: {
            type: String,
            required: false,
        },
        phone: {
            type: String,
            required: false,
        },
        email: {
            type: String,
            required: false,
        },
        admin_id: [
            {
                type: String,
            },
        ],
        number_of_user: {
            type: Number,
            required: false,
            default: 0,
        },
        is_active: {
            type: Boolean,
            required: false,
            default: true,
        },
        created_time: {
            type: Date,
            required: true,
        },
        services: [
            {
                type: String,
            },
        ],
        webconsent_url: {
            type: String,
            required: false,
        },
    },
    {
        versionKey: false,
    }
);

export type ITenantModel = ITenant;

const Tenant = mongoose.model<ITenantModel>("Tenant", tenantSchema);
export default Tenant;
