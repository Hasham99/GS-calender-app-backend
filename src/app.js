import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import { errorHandler } from "./middlewares/error.middleware.js";
import authRoutes from "./routes/auth.routes.js";
import facilityRoutes from "./routes/facility.routes.js";
import bookingRoutes from "./routes/booking.routes.js"; // Booking routes

// Initialize the Express app
const app = express();

// Middleware configuration
app.use(
    cors({
        // origin: process.env.CORS_ORIGIN || "*", // Allow CORS from defined origin or all origins
        origin: "http://localhost:5173",
        credentials: true,
    })
);

app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));
app.use(cookieParser());
app.use(morgan("dev"));

// API routes
app.use("/api/v1/auth", authRoutes); // Authentication routes
app.use("/api/v1/facility", facilityRoutes); // Facility routes
app.use("/api/v1/booking", bookingRoutes); // Booking routes

// Root route for health check (optional)
app.use("/", (req, res) => {
    res.status(200).json({ message: "Server is running" });
});

// Global error handler
app.use(errorHandler);

export { app };
