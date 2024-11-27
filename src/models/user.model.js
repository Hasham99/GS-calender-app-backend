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
        unique: true,  // Ensures email is unique
        lowercase: true,
        trim: true,
    },
    password: {
        type: String,
        required: [true, "Password is required"],
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
}, { timestamps: true });


// Create User model
export const User = mongoose.model("User", userSchema);
