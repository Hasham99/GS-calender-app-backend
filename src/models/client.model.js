import mongoose from "mongoose";

const ClientSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },  // Password for authentication
    phoneNumber: { type: String, default: "" },
    users: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],  // Link to Users
    active: { type: Boolean, default: true },  // Client activation status
}, { timestamps: true });

export const Client = mongoose.model("Client", ClientSchema);