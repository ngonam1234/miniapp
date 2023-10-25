import mongoose from "mongoose";
import { IAuto } from "../interfaces/model";

const ticketFieldSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
        },
        display: {
            type: String,
            required: true,
        },
        location: {
            type: String,
            required: true,
        },
    },
    {
        _id: false,
    }
);

const datasourceSchema = new mongoose.Schema(
    {
        href: {
            type: String,
            required: true,
        },
        dependencies: [ticketFieldSchema],
    },
    {
        _id: false,
    }
);
ticketFieldSchema.add({
    datasource: {
        type: datasourceSchema,
        required: false,
    },
});

const matchingCondition = new mongoose.Schema(
    {
        field: {
            type: ticketFieldSchema,
            required: true,
        },
        values: [String],
    },
    {
        _id: false,
    }
);
const infoMemeber = new mongoose.Schema(
    {
        id: {
            type: String,
            required: true,
        },
        fullname: {
            type: String,
            required: true,
        },
        email: {
            type: String,
            required: true,
        },
        phone: {
            type: String,
            require: true,
        },
        is_active: {
            type: Boolean,
            require: true,
        },
        position: {
            type: String,
            require: false,
        },
        created_time: {
            type: Date,
            require: true,
        },
        updated_time: {
            type: Date,
            require: false,
        },
    },
    {
        _id: false,
    }
);

const groupInfo = new mongoose.Schema(
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
        created_time: {
            type: Date,
            require: false,
        },
        is_active: {
            type: Boolean,
            require: false,
        },

        leader: infoMemeber,
        tenant: {
            type: String,
            required: false,
        },
        members: [infoMemeber],
    },
    {
        _id: false,
    }
);

const applyTech = new mongoose.Schema(
    {
        type: {
            type: String,
            required: true,
            enum: ["ALL", "EXCEPT", "ONLINE", "ONLY"],
        },
        techs: [infoMemeber],
    },
    {
        _id: false,
    }
);

const applyTime = new mongoose.Schema(
    {
        type: {
            type: String,
            required: true,
            enum: ["ALL_TIME", "IN_WORK", " OUT_WORK"],
        },
        times: {
            type: String,
            required: false,
            enum: ["8x5", "24x7", "24x5"],
        },
    },
    {
        _id: false,
    }
);

const autoSchema = new mongoose.Schema(
    {
        id: {
            type: String,
            require: true,
        },
        type: {
            type: String,
            required: true,
            enum: ["REQUEST", "INCIDENT"],
        },
        name: {
            type: String,
            require: true,
        },
        tenant: {
            type: String,
            require: true,
        },
        description: {
            type: String,
            require: false,
        },
        apply_request: [
            {
                type: String,
                require: true,
                default: ["CREATE", "EDIT"],
            },
        ],
        is_apply: {
            type: Boolean,
            require: true,
        },
        is_active: {
            type: Boolean,
            require: true,
            default: true,
        },
        is_delete: {
            type: Boolean,
            require: false,
            default: false,
        },
        apply_time: applyTime,
        conditions: [matchingCondition],
        auto_type: {
            type: String,
            require: true,
            enum: ["ROUND_ROBIN", "LOAD_BALANCING"],
        },
        group: groupInfo,
        apply_tech: applyTech,
        created_time: {
            type: Date,
            require: true,
            default: new Date(),
        },
        updated_time: {
            type: Date,
            require: false,
        },
        created_by: {
            type: String,
            require: true,
        },
        updated_by: {
            type: String,
            require: false,
        },
        priority: {
            type: Number,
            require: false,
        },
    },
    {
        versionKey: false,
    }
);

const Auto = mongoose.model<IAuto>("Auto", autoSchema);
export default Auto;
