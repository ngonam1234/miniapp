import mongoose from "mongoose";
import { ITicketHistory } from "../interfaces/models";

export const ticketHistorySchema = new mongoose.Schema(
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

export type ITicketHistoryModel = ITicketHistory;

const Field = mongoose.model<ITicketHistoryModel>(
    "TicketHistory",
    ticketHistorySchema
);
export default Field;
