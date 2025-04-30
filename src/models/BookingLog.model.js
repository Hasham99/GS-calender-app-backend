// models/BookingLog.js
import mongoose from "mongoose";

const bookingLogSchema = new mongoose.Schema(
  {
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client' },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    facility: { type: mongoose.Schema.Types.ObjectId, ref: 'Facility' },
    status: { type: String, enum: ['success', 'error'], required: true },
    message: { type: String },
    data: { type: Object }, // Optional: store request or error details
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);


export const BookingLog = mongoose.model("BookingLog", bookingLogSchema);
