import dotenv from "dotenv";
import moment from "moment-timezone";
import colors from "colors";
import mongoose from "mongoose";

import connectDb from "../db/index.js";
import { Booking } from "../models/booking.model.js";
import { BookingHistory } from "../models/bookingHistory.model.js";

dotenv.config();

const runSyncBookingHistory = async () => {
  try {
    console.log("🚀 Starting Booking History Sync".bgYellow.black);

    await connectDb();

    const now = moment().tz("Asia/Karachi");

    // 1️⃣ Update 'confirmed' → 'completed'
    const confirmedToCompleted = await BookingHistory.updateMany(
      { status: "confirmed" },
      { $set: { status: "completed", deletedAt: now.toDate() } } // ✅ add deletedAt for completed ones
    );

    console.log(
      `✅ Updated ${confirmedToCompleted.modifiedCount} histories from confirmed → completed`
        .green
    );

    // 2️⃣ Fetch all active (pending) bookings
    const activeBookings = await Booking.find({}).lean();
    console.log(`📦 Found ${activeBookings.length} active bookings`.blue);

    let addedCount = 0;

    // 3️⃣ Ensure each booking exists in BookingHistory
    for (const booking of activeBookings) {
      const existingHistory = await BookingHistory.findOne({
        $or: [
          { bookingId: booking._id },
          {
            bookingId: { $exists: false },
            clientId: booking.clientId,
            facility: booking.facility,
            user: booking.user,
            startDate: booking.startDate,
            endDate: booking.endDate,
          },
        ],
      });

      if (!existingHistory) {
        await BookingHistory.create({
          bookingId: booking._id,
          clientId: booking.clientId,
          facility: booking.facility,
          user: booking.user,
          startDate: booking.startDate,
          endDate: booking.endDate,
          status: "pending",
          conditionsAccepted: booking.conditionsAccepted,
          deletedAt: null, // ✅ pending bookings are not deleted yet
        });
        addedCount++;
        console.log(`🟡 Added missing booking to history: ${booking._id}`);
      }
    }

    console.log(
      `🎯 Sync Completed — ${addedCount} pending bookings added to history`.bgBlue.white
    );

    await mongoose.connection.close();
    console.log("🔌 MongoDB disconnected".gray);
  } catch (error) {
    console.error("❌ Error during Booking History Sync:", error);
    process.exit(1);
  }
};

runSyncBookingHistory();
