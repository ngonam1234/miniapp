import mongoose from "mongoose";

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
            type: String,
            required: false,
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

export default peopleSchema;
