import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    plainPassword: { type: String },
    phoneNumber: { type: String, unique: true, trim: true },
    valid: { type: Boolean, default: true },
    otp: { type: Number, default: null },
    role: {
        type: String,
        enum: ["user", "admin"], // Allow only "user" and "admin" roles
        default: "user",
    },
    facilities: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Facility",
        },
    ],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // Reference to the user who created this user
}, { timestamps: true });

export const User = mongoose.model("User", userSchema);
