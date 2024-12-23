import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema(
    {
        facility: { type: mongoose.Schema.Types.ObjectId, ref: "Facility", required: true },
        // facility: { type: String, required: true },
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        startDate: { type: Date, required: true },  // The start date and time for the booking
        endDate: { type: Date, required: true },    // The end date and time for the booking
        status: { type: String, enum: ["confirmed", "pending", "completed"], default: "confirmed" },
        conditionsAccepted: { type: Boolean, required: true },
    },
    { timestamps: true }
);

export const Booking = mongoose.model("Booking", bookingSchema);
