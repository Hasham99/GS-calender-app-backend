
import mongoose, { Schema } from "mongoose";

const userSchema = new Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    fullName: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    password: {
        type: String,
        required: true,
    },
    phoneNo: {
        type: Number,
        required: true
    },
    address: {
        type: String,
        required: true
    },
    secret: {
        type: String,
        required: true
    },
    role: {
        type: Number,
        default: 0
    }

}, { timestamps: true })

export const User = mongoose.model("User", userSchema)