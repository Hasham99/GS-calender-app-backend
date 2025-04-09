// models/Limitation.js
import mongoose from "mongoose";

const limitationSchema = new mongoose.Schema({
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  rules: [
    {
      facility: { type: mongoose.Schema.Types.ObjectId, ref: 'Facility', required: true },
      maxBookingsPerWeek: { type: Number, default: 3 },
      maxBookingsPerMonth: { type: Number, default: 10 },
      maxWeeksAdvance: { type: Number, default: 4 },
      overriddenBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
    }
  ]
}, { timestamps: true });

export const Limitation = mongoose.model("Limitation", limitationSchema);
