import mongoose from "mongoose";

const facilitySchema = new mongoose.Schema({
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
    name: { type: String, required: true },
    description: { type: String },
    availability: { type: Boolean, default: true },
}, { timestamps: true });

// Use existing model if already compiled, otherwise define it
export const Facility = mongoose.models.Facility || mongoose.model("Facility", facilitySchema);
