import mongoose from "mongoose";
import { ITicket } from "../interfaces/models";
import { fieldSchema } from "./field";
import { statusSchema } from "./status";
import { layoutItemSchema, templateSchema } from "./template";
import { nodeSchema, workflowSchema } from "./workflow";
import { slaSchema } from "./sla";

const ticketTemplateSchema = templateSchema.clone();
const ticketWorkflowSchema = workflowSchema.clone();
const ticketStatusSchema = statusSchema.clone();
const ticketFieldSchema = fieldSchema.clone();

const ticketNodeSchema = nodeSchema.clone();
const ticketLayoutItemSchema = layoutItemSchema.clone();

ticketWorkflowSchema.set("_id", false);
ticketTemplateSchema.set("_id", false);
ticketStatusSchema.set("_id", false);
ticketFieldSchema.set("_id", false);

ticketNodeSchema.path("status", ticketStatusSchema);
ticketWorkflowSchema.path("nodes", [ticketNodeSchema]);
ticketLayoutItemSchema.path("field", ticketFieldSchema);
ticketTemplateSchema.path("technician_layout", [ticketLayoutItemSchema]);
ticketTemplateSchema.path("enduser_layout", [ticketLayoutItemSchema]);

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
        phone: {
            type: String,
            required: false,
        },
        tenant: {
            type: String,
            required: false,
        },
        department: {
            type: {
                id: { type: String, required: true },
                name: { type: String, required: true },
            },
            required: false,
            _id: false,
        },
        position: {
            type: String,
            required: false,
        },
    },
    {
        _id: false,
    }
);

const defaultFieldSchema = new mongoose.Schema(
    {
        id: {
            type: String,
            required: true,
        },
        name: {
            type: String,
            required: true,
        },
    },
    {
        _id: false,
    }
);

const statusFieldSchema = new mongoose.Schema(
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
    },
    {
        _id: false,
    }
);

const reply = new mongoose.Schema(
    {
        reply_id: {
            type: String,
            required: false,
        },
        reply_content: {
            type: String,
            required: false,
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
        attachments: [
            {
                type: String,
                required: false,
            },
        ],
        is_reply: {
            type: Boolean,
            required: false,
            default: false,
        },
        reply_comment: {
            type: reply,
            required: false,
        },
        content: {
            type: String,
            required: false,
        },
        created_time: {
            type: Date,
            required: false,
        },
        updated_time: {
            type: Date,
            required: false,
        },
        is_view_eu: {
            type: Boolean,
            required: false,
            default: true,
        },
        creator: {
            type: peopleSchema,
            required: true,
        },
        activities: [
            {
                action: {
                    type: String,
                    required: false,
                },
                time: {
                    type: Date,
                    required: false,
                    default: new Date(),
                },
                old: {
                    type: String,
                    required: false,
                },
                new: {
                    type: String,
                    required: false,
                },
            },
        ],
    },
    {
        _id: false,
    }
);

const customFieldSchema = new mongoose.Schema(
    {
        value: {
            type: String,
            required: true,
        },
        display: {
            type: String,
            required: true,
        },
    },
    {
        _id: false,
    }
);

const resolutionSchema = new mongoose.Schema(
    {
        cause: {
            type: {
                content: {
                    type: String,
                    required: false,
                },
                updated_time: {
                    type: Date,
                    required: true,
                },
                updated_by: {
                    type: peopleSchema,
                    required: true,
                },
                attachments: [
                    {
                        type: String,
                        required: false,
                    },
                ],
            },
            required: false,
            _id: false,
        },
        solution: {
            type: {
                content: {
                    type: String,
                    required: false,
                },
                updated_time: {
                    type: Date,
                    required: true,
                },
                updated_by: {
                    type: peopleSchema,
                    required: true,
                },
                attachments: [
                    {
                        type: String,
                        required: false,
                    },
                ],
            },
            required: false,
            _id: false,
        },
    },
    {
        _id: false,
    }
);

const ticketActivitySchema = new mongoose.Schema(
    {
        action: {
            type: String,
            required: true,
        },
        time: {
            type: Date,
            required: true,
        },
        actor: {
            type: peopleSchema,
            required: true,
        },
        note: {
            type: String,
            required: false,
        },
        comment: commentSchema,
        updates: [
            new mongoose.Schema(
                {
                    field: {
                        type: {
                            name: {
                                type: String,
                                required: true,
                            },
                            display: {
                                type: String,
                                required: true,
                            },
                        },
                        _id: false,
                    },
                    old: {
                        type: mongoose.SchemaTypes.Mixed,
                        required: false,
                        _id: false,
                    },
                    new: {
                        type: mongoose.SchemaTypes.Mixed,
                        required: false,
                        _id: false,
                    },
                },
                { _id: false }
            ),
        ],
    },
    {
        _id: false,
    }
);

const connectSchema = new mongoose.Schema(
    {
        requests: [
            {
                type: String,
                required: false,
            },
        ],
        incidents: [
            {
                type: String,
                required: false,
            },
        ],
    },
    {
        _id: false,
    }
);

const ticketSchema = new mongoose.Schema(
    {
        id: {
            type: String,
            required: true,
        },
        number: {
            type: String,
            required: true,
        },
        name: {
            type: String,
            required: true,
        },
        description: {
            type: String,
            required: true,
        },
        tenant: {
            type: String,
            required: true,
        },
        status: {
            type: statusFieldSchema,
            required: false,
        },
        priority: {
            type: defaultFieldSchema,
            required: false,
        },
        urgency: {
            type: defaultFieldSchema,
            required: false,
        },
        impact: {
            type: defaultFieldSchema,
            required: false,
        },
        type: {
            type: defaultFieldSchema,
            required: false,
        },
        channel: {
            type: defaultFieldSchema,
            required: false,
        },
        group: {
            type: defaultFieldSchema,
            required: false,
        },
        service: {
            type: defaultFieldSchema,
            required: false,
        },
        sub_service: {
            type: defaultFieldSchema,
            required: false,
        },
        category: {
            type: defaultFieldSchema,
            required: false,
        },
        sub_category: {
            type: defaultFieldSchema,
            required: false,
        },
        creator: {
            type: peopleSchema,
            required: true,
        },
        requester: {
            type: peopleSchema,
            required: true,
        },
        technician: {
            type: peopleSchema,
            required: false,
        },
        resolution: {
            type: resolutionSchema,
            required: false,
        },
        overdue_time: {
            type: Date,
            required: false,
        },
        created_time: {
            type: Date,
            required: true,
        },
        updated_time: {
            type: Date,
            required: false,
        },
        closed_time: {
            type: Date,
            required: false,
        },
        resolved_time: {
            type: Date,
            required: false,
        },
        ct_fields: [
            {
                k: {
                    type: String,
                    required: true,
                },
                v: {
                    type: customFieldSchema,
                    required: true,
                },
            },
        ],
        template: {
            type: ticketTemplateSchema,
            required: true,
        },
        workflow: {
            type: ticketWorkflowSchema,
            required: false,
        },
        activities: [ticketActivitySchema],
        attachments: [
            {
                type: String,
                required: false,
            },
        ],
        watchers: [
            {
                type: String,
                required: false,
            },
        ],
        sla: {
            required: false,
            type: slaSchema,
        },
        connect: {
            type: connectSchema,
            require: false,
        },
    },
    {
        versionKey: false,
    }
);

const Ticket = mongoose.model<ITicket>("Ticket", ticketSchema);
export default Ticket;
