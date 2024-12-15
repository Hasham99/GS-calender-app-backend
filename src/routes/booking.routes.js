import { Router } from "express";
import { createBookingController, getBookingsController } from "../controllers/booking.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

// Get all bookings (optional)
router.route("/").get(verifyJWT, getBookingsController);

// Create a new booking
router.route("/").post(verifyJWT, createBookingController);

export default router;
