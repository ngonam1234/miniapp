import mongoose from "mongoose";

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
        is_overdue: {
            type: Boolean,
            required: true,
        },
        job: {
            type: String,
            required: false,
        },
        notify_to: [notiRecipientSchema],
        update_fields: [updatingFieldSchema],
    },
    { _id: false }
);

export const slaSchema = new mongoose.Schema(
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
            required: false,
            default: true,
        },

        working_time: {
            type: String,
            required: false,
            enum: ["8x5", "24x7", "24x5"],
        },
        include_holiday: {
            type: Boolean,
            required: false,
        },

        response_assurance: {
            type: {
                determine_by: {
                    type: String,
                    required: true,
                    enum: ["CHANGE_STATUS", "FIRST_RESPONSE"],
                },
                overdue_time: {
                    type: Date,
                    required: false,
                },
                actual_time: {
                    type: Date,
                    required: false,
                },
                time_limit: {
                    type: Number,
                    required: true,
                },
                is_overdue: {
                    type: Boolean,
                    required: true,
                },
                job: {
                    type: String,
                    required: false,
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
                overdue_time: {
                    type: Date,
                    required: false,
                },
                actual_time: {
                    type: Date,
                    required: false,
                },
                time_limit: {
                    type: Number,
                    required: true,
                },
                is_overdue: {
                    type: Boolean,
                    required: true,
                },
                job: {
                    type: String,
                    required: false,
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
        _id: false,
    }
);
