import mongoose from "mongoose";
import { IService } from "../interfaces/models";

const serviceSchema = new mongoose.Schema(
    {
        id: {
            type: String,
            require: true,
        },
        name: {
            type: String,
            unique: true,
            require: true,
        },
        type: {
            type: String,
            enum: ["BUSINESS_SERVICE", "TECHNICAL_SERVICE"],
            require: true,
        },
        description: {
            type: String,
            require: false,
        },
        sub_services: {
            type: [
                {
                    id: {
                        type: String,
                        require: true,
                    },
                    name: {
                        type: String,
                        require: true,
                    },
                    sub_services_L2: {
                        type: [
                            {
                                id: {
                                    type: String,
                                    require: true,
                                },
                                name: {
                                    type: String,
                                    required: true,
                                },
                                is_deleted: {
                                    type: Boolean,
                                    require: false,
                                    default: false,
                                },
                            },
                        ],
                        required: false,
                        _id: false,
                    },
                    is_deleted: {
                        type: Boolean,
                        require: false,
                        default: false,
                    },
                },
            ],
            require: false,
            _id: false,
        },
        categories: {
            type: [
                {
                    id: {
                        type: String,
                        require: true,
                    },
                    name: {
                        type: String,
                        require: true,
                    },
                    description: {
                        type: String,
                        require: false,
                    },
                    technician: {
                        type: String,
                        require: false,
                    },
                    sub_categories: {
                        type: [
                            {
                                id: {
                                    type: String,
                                    require: true,
                                },
                                name: {
                                    type: String,
                                    required: true,
                                },
                                description: {
                                    type: String,
                                    required: false,
                                },
                                is_deleted: {
                                    type: Boolean,
                                    require: false,
                                    default: false,
                                },
                            },
                        ],
                        required: false,
                        _id: false,
                    },
                    is_deleted: {
                        type: Boolean,
                        require: false,
                        default: false,
                    },
                },
            ],
            require: false,
            _id: false,
        },
        manager: {
            type: String,
            require: false,
        },
        department: {
            type: String,
            require: false,
        },
        time_process: {
            type: Number,
            require: false,
        },
        time_support: {
            type: String,
            enum: ["8x5", "24x7"],
            require: false,
        },
        tenant: {
            type: String,
            require: true,
        },
        created_time: {
            type: Date,
            require: true,
        },
        updated_time: {
            type: Date,
            require: false,
        },
        is_active: {
            type: Boolean,
            require: false,
            default: true,
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
export type IServiceModel = IService;

const Service = mongoose.model<IServiceModel>("Service", serviceSchema);
export default Service;
