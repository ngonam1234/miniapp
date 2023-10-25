import { IIdentity } from "./../interfaces";
import mongoose from "mongoose";

const identitySchema = new mongoose.Schema(
    {
        key: {
            type: String,
            required: true,
        },
        number: {
            type: Number,
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
    },
    {
        versionKey: false,
    }
);

const Identity = mongoose.model<IIdentity>("Identity", identitySchema);
export default Identity;
