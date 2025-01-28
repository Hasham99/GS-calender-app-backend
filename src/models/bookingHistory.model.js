import mongoose from "mongoose";

const bookingHistorySchema = new mongoose.Schema(
    {
        clientId: { type: mongoose.Schema.Types.ObjectId, ref: "Client", required: true },
        facility: { type: mongoose.Schema.Types.ObjectId, ref: "Facility", required: true },
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        startDate: { type: Date, required: true },
        endDate: { type: Date, required: true },
        status: { type: String, enum: ["confirmed", "pending", "completed"], default: "confirmed" },
        conditionsAccepted: { type: Boolean, required: true },
        deletedAt: { type: Date, required: true }, // Timestamp when the booking was moved to history
    },
    { timestamps: true }
);

export const BookingHistory = mongoose.model("BookingHistory", bookingHistorySchema);
