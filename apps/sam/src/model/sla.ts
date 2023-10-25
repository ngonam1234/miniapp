import mongoose from "mongoose";
import { ISla } from "../interfaces/model";

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

const notiRecipientSchema = new mongoose.Schema(
    {
        type: {
            type: String,
            required: true,
        },
        recipient: {
            type: String,
            required: true,
        },
    },
    { _id: false }
);

const updatingFieldSchema = new mongoose.Schema(
    {
        field: {
            type: ticketFieldSchema,
            required: true,
        },
        value: {
            type: String,
            required: false,
        },
    },
    { _id: false }
);

const levelEscalationSchema = new mongoose.Schema(
    {
        type: {
            type: String,
            required: true,
            enum: ["BEFORE_OVERDUE", "AFTER_OVERDUE"],
        },
        amount_time: {
            type: Number,
            required: true,
        },
        notify_to: [notiRecipientSchema],
        update_fields: [updatingFieldSchema],
    },
    { _id: false }
);

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

const slaSchema = new mongoose.Schema(
    {
        id: {
            type: String,
            required: true,
        },
        module: {
            type: String,
            required: true,
            enum: ["REQUEST", "INCIDENT"],
        },
        name: {
            type: String,
            required: true,
        },
        description: {
            type: String,
            required: false,
        },
        order: {
            type: Number,
            required: true,
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
        working_time: {
            type: String,
            required: true,
            enum: ["8x5", "24x7", "24x5"],
        },
        include_holiday: {
            type: Boolean,
            required: false,
        },

        matching_rule: {
            type: new mongoose.Schema(
                {
                    type: {
                        type: String,
                        required: true,
                    },
                    conditions: [matchingCondition],
                },
                { _id: false }
            ),
            required: false,
        },

        response_assurance: {
            type: {
                determine_by: {
                    type: String,
                    required: true,
                    enum: ["CHANGE_STATUS", "FIRST_RESPONSE"],
                },
                time_limit: {
                    type: Number,
                    required: true,
                },
                first_level: {
                    type: levelEscalationSchema,
                    required: false,
                },
                second_level: {
                    type: levelEscalationSchema,
                    required: false,
                },
            },
            required: false,
            _id: false,
        },
        resolving_assurance: {
            type: {
                time_limit: {
                    type: Number,
                    required: true,
                },
                first_level: {
                    type: levelEscalationSchema,
                    required: false,
                },
                second_level: {
                    type: levelEscalationSchema,
                    required: false,
                },
                third_level: {
                    type: levelEscalationSchema,
                    required: false,
                },
                four_level: {
                    type: levelEscalationSchema,
                    required: false,
                },
            },
            required: false,
            _id: false,
        },

        created_time: {
            type: Date,
            required: true,
            default: new Date(),
        },
        updated_time: {
            type: Date,
            required: false,
        },
        created_by: {
            type: String,
            required: true,
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

const Sla = mongoose.model<ISla>("Sla", slaSchema);
export default Sla;
