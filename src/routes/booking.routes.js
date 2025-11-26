import { Router } from "express";
import { createBookingController, getBookingHistoryByIdController, getBookingsController, getBookingHistoryByUserIdController, deleteBookingController, updateBookingController, getBookingLogsController, autoCleanUpBookings, findBrokenUserHistories, deleteBrokenUserHistories } from "../controllers/booking.controller.js";
import { verifyClientOrAdmin, verifyJWT } from "../middlewares/auth.middleware.js";

import { autoCleanUpBookingsController, getBookingHistoryController } from "../controllers/booking.controller.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

// Create a new booking
router.route("/").post(verifyJWT, createBookingController);

// Get booking logs
router.route("/logs").get(verifyClientOrAdmin, getBookingLogsController);

//delete booking by id
router.route("/:id").delete(verifyJWT, deleteBookingController);

//update booking by id
router.route("/:id").put(verifyJWT, updateBookingController);

// Get all bookings (optional)
router.route("/").get(verifyJWT,getBookingsController);

// Get Booking History
// router.route("/booking-history").get(verifyJWT,getBookingHistoryController);
router.route("/booking-history").get(getBookingHistoryController);

// router.route("/booking-history/:id").get(verifyJWT,getBookingHistoryByUserIdController);
router.route("/booking-history/:id").get(getBookingHistoryByUserIdController);

// router.route("/history/null-user").get(findBrokenUserHistories);
// router.route("/history/null-user/delete").delete(deleteBrokenUserHistories);

// Manual endpoint to trigger cleanup
// router.route("/cleanup").get(autoCleanUpBookingsController);

// 🔒 (Optional) Add a secret key to prevent public access
// router.route("/run-cleanup").get(async (req, res) => {
//   await autoCleanUpBookings();
//   res.json({ message: "Cleanup job executed successfully" });
// })

export default router;
