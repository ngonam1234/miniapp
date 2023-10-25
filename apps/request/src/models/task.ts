import mongoose from "mongoose";
import { ITask } from "../interfaces/models";

const peopleSchema = new mongoose.Schema(
    {
        id: {
            type: String,
            required: true,
        },
        fullname: {
            type: String,
            required: false,
        },
        email: {
            type: String,
            required: true,
        },
        department: {
            type: {
                id: {
                    type: String,
                    required: true,
                },
                name: {
                    type: String,
                    required: true,
                },
            },
            required: false,
            _id: false,
        },
    },
    {
        _id: false,
    }
);

const commentSchema = new mongoose.Schema(
    {
        id: {
            type: String,
            required: true,
        },
        content: {
            type: String,
            required: true,
        },
        created_time: {
            type: Date,
            required: true,
        },
        creator: {
            type: peopleSchema,
            required: false,
        },
    },
    {
        _id: false,
    }
);

const taskSchema = new mongoose.Schema(
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
        ticket_id: {
            type: String,
            require: true,
        },
        type: {
            type: {
                id: {
                    type: String,
                    required: true,
                },
                name: {
                    type: String,
                    required: true,
                },
            },
            required: false,
            _id: false,
        },
        group: {
            type: {
                id: {
                    type: String,
                    required: true,
                },
                name: {
                    type: String,
                    required: true,
                },
            },
            required: true,
            _id: false,
        },
        technician: {
            type: {
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
            },
            required: true,
            _id: false,
        },
        estimated_time: {
            type: {
                begin: {
                    type: Date,
                    required: true,
                },
                end: {
                    type: Date,
                    required: true,
                },
            },
            required: true,
            _id: false,
        },

        actual_time: {
            type: {
                begin: {
                    type: Date,
                    required: false,
                },
                end: {
                    type: Date,
                    required: false,
                },
            },
            required: false,
            _id: false,
        },
        handling_time: {
            type: String,
            required: false,
            enum: ["8x5", "24x5", "24x24"],
            default: "8x5",
        },
        approver: {
            type: {
                id: {
                    type: String,
                    required: true,
                },
                fullname: {
                    type: String,
                    required: false,
                },
                email: {
                    type: String,
                    required: true,
                },
            },
            required: false,
            _id: false,
        },
        status: {
            type: String,
            required: true,
            enum: ["UNHANDLED", "HANDLING", "FINISHED"],
            default: "UNHANDLED",
        },
        approval_status: {
            type: String,
            required: false,
            enum: [
                "WAITING_APPROVAL",
                "REJECT",
                "APPROVED",
                "NEED_CLARIFICATION",
            ],
            default: "WAITING_APPROVAL",
        },

        activities: [
            new mongoose.Schema(
                {
                    action: {
                        type: String,
                        required: true,
                        enum: ["CREATE", "UPDATE", "APPROVE"],
                    },
                    actor: {
                        type: peopleSchema,
                        required: true,
                    },
                    time: {
                        type: Date,
                        required: true,
                    },
                    comment: {
                        type: commentSchema,
                        required: false,
                    },
                },
                { _id: false }
            ),
        ],
        needed_approval: {
            type: Boolean,
            required: false,
            default: false,
        },
        added_worklog: {
            type: Boolean,
            required: false,
        },
        approved_time: {
            type: Date,
            required: false,
        },
        created_by: {
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

const Task = mongoose.model<ITask>("Task", taskSchema);
export default Task;
