import mongoose from "mongoose";
import { IWorkflow } from "../interfaces/models";

const conditionSchema = new mongoose.Schema(
    {
        type: {
            type: String,
            required: true,
        },
        field: {
            type: {
                title: {
                    type: String,
                    required: false,
                },
                name: {
                    type: String,
                    required: false,
                },
            },
            required: true,
            _id: false,
        },
        value: {
            type: String,
            required: false,
        },
    },
    {
        versionKey: false,
        _id: false,
    }
);

export const actionSchema = new mongoose.Schema(
    {
        type: {
            type: String,
            required: false,
        },
        email_template: {
            type: String,
            required: false,
        },
        params: [
            {
                type: {
                    type: String,
                    required: false,
                },
                value: [
                    {
                        type: String,
                        required: false,
                    },
                ],
                name: {
                    type: String,
                    required: false,
                },
            },
        ],
    },
    {
        versionKey: false,
        _id: false,
    }
);
export const edgeSchema = new mongoose.Schema(
    {
        source: {
            type: String,
            required: true,
        },
        target: {
            type: String,
            required: true,
        },
        before_rule: {
            type: String,
            required: false,
        },
        during_rule: {
            type: String,
            required: false,
        },
        transition: {
            type: {
                name: {
                    type: String,
                    required: false,
                },
                rules: {
                    type: [
                        {
                            type: {
                                type: String,
                                required: false,
                                default: "AND",
                            },
                            condition: {
                                type: conditionSchema,
                                required: true,
                            },
                        },
                    ],
                    required: false,
                    _id: false,
                },
                triggers: {
                    type: [
                        {
                            rules: [
                                {
                                    type: {
                                        type: String,
                                        required: false,
                                        default: "AND",
                                    },
                                    condition: {
                                        type: conditionSchema,
                                        required: true,
                                    },
                                },
                            ],
                            actions: [
                                {
                                    type: {
                                        type: String,
                                        required: true,
                                    },
                                    field: {
                                        type: String,
                                        required: false,
                                    },
                                    value: {
                                        type: String,
                                        required: false,
                                    },
                                },
                            ],
                        },
                    ],
                    required: false,
                    _id: false,
                },
            },
            required: false,
            _id: false,
        },
        actions: [actionSchema],
    },
    {
        _id: false,
        versionKey: false,
    }
);

export const nodeSchema = new mongoose.Schema(
    {
        id: {
            type: String,
            required: true,
        },
        type: {
            type: String,
            required: true,
        },
        status: {
            type: String,
            required: false,
        },
        x: {
            type: Number,
            required: true,
        },
        y: {
            type: Number,
            required: true,
        },
    },
    {
        _id: false,
        versionKey: false,
    }
);

export const workflowSchema = new mongoose.Schema(
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
            default: "DEFAULT",
        },
        description: {
            type: String,
            required: false,
        },
        tenant: {
            type: String,
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
        updated_by: {
            type: String,
            required: false,
        },
        is_active: {
            type: Boolean,
            required: false,
            default: true,
        },
        edges: [edgeSchema],
        nodes: [nodeSchema],
    },
    {
        versionKey: false,
    }
);

const Workflow = mongoose.model<IWorkflow>("Workflow", workflowSchema);
export default Workflow;
