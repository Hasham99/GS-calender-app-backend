import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, "Name is required"],
        trim: true,
    },
    email: {
        type: String,
        required: [true, "Email is required"],
        unique: true,
        lowercase: true,
        trim: true,
    },
    password: {
        type: String,
        required: [true, "Password is required"],
    },
    plainPassword: { type: String }, // Temporary field for storing plain password
    phoneNumber: {
        type: String,
        unique: true,
        trim: true,
    },
    valid: {
        type: Boolean,
        default: true,
    },
    otp: {
        type: Number,
        default: null,
    },
    role: {
        type: String,
        enum: [
            "family_member",
            "admin",
            "maintenance_manager",
            "maintenance_staff",
            "kitchen_manager",
            "staff_member",
            "family_stakeholder",
        ],
        default: "family_member",
    },
    facilities: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Facility",
        required: [true, "At least one facility allocation is required"],
    }],
}, { timestamps: true });

export const User = mongoose.model("User", userSchema);
