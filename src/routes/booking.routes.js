import { Router } from "express";
import { createBookingController, getBookingHistoryByIdController, getBookingsController, getBookingHistoryByUserIdController, deleteBookingController, updateBookingController } from "../controllers/booking.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

import { autoCleanUpBookingsController, getBookingHistoryController } from "../controllers/booking.controller.js";

const router = Router();

// Create a new booking
router.route("/").post(verifyJWT, createBookingController);

//delete booking by id
router.route("/:id").delete(verifyJWT, deleteBookingController);

//update booking by id
router.route("/:id").put(verifyJWT, updateBookingController);

// Get all bookings (optional)
router.route("/").get(getBookingsController);

// Get Booking History
router.route("/booking-history").get(getBookingHistoryController);

router.route("/booking-history/:id").get(getBookingHistoryByUserIdController);

// Manual endpoint to trigger cleanup
router.route("/cleanup").get(autoCleanUpBookingsController);

export default router;
