import mongoose from "mongoose";
import { IServicePackage } from "../interfaces/models";

export const servicePackageSchema = new mongoose.Schema(
    {
        id: {
            type: String,
            required: true,
        },
    },
    {
        versionKey: false,
    }
);

export type IServicePackageModel = IServicePackage;

const Field = mongoose.model<IServicePackageModel>(
    "ServicePackage",
    servicePackageSchema
);
export default Field;
