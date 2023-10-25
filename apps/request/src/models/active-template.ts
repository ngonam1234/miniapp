import mongoose from "mongoose";
import { IActiveTemplate } from "../interfaces/models";

const activeTemplateSchema = new mongoose.Schema(
    {
        id: {
            type: String,
            required: true,
        },
        code: {
            type: String,
            required: true,
        },
        template: {
            type: [String],
            required: false,
        },
        is_active: {
            type: Boolean,
            required: false,
        },
    },
    {
        versionKey: false,
    }
);

const ActiveTemplate = mongoose.model<IActiveTemplate>(
    "activetemplate",
    activeTemplateSchema
);
export default ActiveTemplate;
