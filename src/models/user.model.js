import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
    name: { type: String, trim: true }, // Name is optional for invited users
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String }, // No password for invited users initially
    plainPassword: { type: String },
    phoneNumber: { type: String, unique: true, trim: true },
    // valid: { type: Boolean, default: true },
    valid: { type: Boolean, default: false }, // Users start as invalid (pending)
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
    maxWeeksAdvance: { type: Number, default: 4 },  // Default: 4 weeks
    maxBookingsPerWeek: { type: Number, default: 3 }, // Default: 3 bookings per week
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // Reference to the user who created this user
    invitedAt: { type: Date, default: Date.now }, // Track when they were invited
    acceptedAt: { type: Date }, // When they accept the invitation
    
}, { timestamps: true });

export const User = mongoose.model("User", userSchema);
