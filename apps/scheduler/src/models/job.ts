import mongoose from "mongoose";
import { IJob } from "../interfaces";

const jobSchema = new mongoose.Schema(
    {
        id: {
            type: String,
            required: true,
        },
        tags: [
            {
                type: String,
                required: true,
            },
        ],
        type: {
            type: String,
            required: true,
            enum: ["ONE_TIME", "RECURRING"],
        },
        expression: {
            type: String,
            required: false,
        },
        status: {
            type: String,
            required: false,
            default: "PENDING",
            enum: ["PENDING", "SCHEDULED"],
        },
        created_time: {
            type: Date,
            required: true,
        },
        execution_time: {
            type: Date,
            required: false,
        },
        execution: {
            type: new mongoose.Schema({
                type: {
                    type: String,
                    required: true,
                    enum: ["HTTP_REQ"],
                },
                http_request: {
                    type: {
                        url: {
                            type: String,
                            required: true,
                        },
                        method: {
                            type: String,
                            required: true,
                            enum: ["GET", "POST", "PUT", "DELETE"],
                        },
                        headers: [
                            {
                                name: {
                                    type: String,
                                    required: true,
                                },
                                value: {
                                    type: String,
                                    required: true,
                                },
                            },
                        ],
                        params: [
                            {
                                name: {
                                    type: String,
                                    required: true,
                                },
                                value: {
                                    type: String,
                                    required: true,
                                },
                            },
                        ],
                        data: {
                            type: String,
                            required: false,
                        },
                    },
                    required: true,
                    _id: false,
                },
            }),
            required: true,
            _id: false,
        },
    },
    {
        versionKey: false,
    }
);

const Job = mongoose.model<IJob>("Job", jobSchema);
export default Job;
