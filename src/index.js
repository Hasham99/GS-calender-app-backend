import { app } from "./app.js";
import dotenv from "dotenv";
import connectDb from "./db/index.js";
import "colors";
import { createServer } from "http";
import { Server } from "socket.io";
import { Booking } from "./models/booking.model.js";
import cron from "node-cron";
import { autoCleanUpBookings } from "./controllers/booking.controller.js";


// Load environment variables
dotenv.config({
    path: "./.env",
});

// Create HTTP server
const server = createServer(app);

// Attach Socket.IO to the server
const io = new Server(server, {
    cors: {
        origin: process.env.CORS_ORIGIN || "*", // Allow requests from your frontend
        methods: ["GET", "POST"],
    },
});

// Attach Socket.IO to the app for global access
app.set("io", io);

io.on("connection", (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // Listen for requests to fetch bookings
    socket.on("request_bookings", async () => {
        try {
            const bookings = await Booking.find().populate([{ path: 'facility', select: 'name description' }, { path: 'user', select: 'name email role' }]).exec();
            console.log("Emitting bookings to client:", bookings); // Debugging log
            socket.emit("bookings_list", bookings); // Emit to the requesting client
        } catch (error) {
            console.error("Error fetching bookings:", error);
            socket.emit("bookings_list_error", { message: "Failed to fetch bookings" });
        }
    });

    // Listen for socket disconnection
    socket.on("disconnect", () => {
        console.log(`Socket disconnected: ${socket.id}`);
    });
});

// Connect to the database and start the server
connectDb()
    .then(() => {
        server.listen(process.env.PORT || 8090, () => {
            console.log(
                `Database Connected & ⚙️ Server running on Port: ${process.env.PORT || 8090}`.bgWhite.black
            );
        });
    })
    .catch((error) => {
        console.error(`DB connection error: ${error}`.red);
    });


// Schedule the cleanup to run every minute (adjust timing as needed)
cron.schedule("*/30 * * * *", async () => {
    console.log("Running scheduled job: autoCleanUpBookings...".bgRed.white);
    await autoCleanUpBookings();
});