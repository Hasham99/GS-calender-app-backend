import { Router } from "express";
import { createBookingController, getBookingHistoryByIdController, getBookingsController } from "../controllers/booking.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

import { autoCleanUpBookingsController, getBookingHistoryController } from "../controllers/booking.controller.js";

const router = Router();

// Get all bookings (optional)
router.route("/").get(getBookingsController);

// Create a new booking
router.route("/").post(verifyJWT, createBookingController);

// Get Booking History
router.get("/booking-history", getBookingHistoryController);

router.get("/booking-history/:id", getBookingHistoryByIdController);

// Manual endpoint to trigger cleanup
router.get("/cleanup", autoCleanUpBookingsController);

export default router;
