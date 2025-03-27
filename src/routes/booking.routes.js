import { Router } from "express";
import { createBookingController, getBookingHistoryByIdController, getBookingsController, getBookingHistoryByUserIdController } from "../controllers/booking.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

import { autoCleanUpBookingsController, getBookingHistoryController } from "../controllers/booking.controller.js";

const router = Router();

// Create a new booking
router.route("/").post(verifyJWT, createBookingController);

// Get all bookings (optional)
router.route("/").get(getBookingsController);

// Get Booking History
router.route("/booking-history").get(getBookingHistoryController);

router.route("/booking-history/:id").get(getBookingHistoryByUserIdController);

// Manual endpoint to trigger cleanup
router.route("/cleanup").get(autoCleanUpBookingsController);

export default router;
