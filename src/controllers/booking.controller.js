import { Booking } from "../models/booking.model.js";  // Importing the Booking model
import { Facility } from "../models/facility.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { apiResponse } from "../utils/apiResponse.js";
import { apiError } from "../utils/apiError.js";
import { User } from "../models/user.model.js";
import { BookingHistory } from "../models/bookingHistory.model.js";
import moment from "moment-timezone";

// Get all bookings
const getBookingsControllerPer = asyncHandler(async (req, res) => {
    const bookings = await Booking.find().populate("user", "name email").populate("facility", "name description"); // Populate user and facility details
    return res.status(200).json(new apiResponse(200, bookings, "Bookings fetched successfully"));
});


const createBookingController = asyncHandler(async (req, res) => {
    const { facility, user, startDate, endDate, conditionsAccepted } = req.body;

    // Debugging incoming data
    console.log("Incoming booking request:", req.body);

    // Validate required fields
    if (!facility || !user || !startDate || !endDate || conditionsAccepted === undefined) {
        throw new apiError(400, "All fields are required");
    }

    // Validate start and end date logic
    if (new Date(startDate) >= new Date(endDate)) {
        throw new apiError(400, "Start date must be before the end date");
    }

    // Check if the facility exists
    const facilityExists = await Facility.findById(facility);
    if (!facilityExists) {
        throw new apiError(400, "Facility not found");
    }

    // Check if the User exists
    const userExists = await User.findById(user);
    if (!userExists) {
        throw new apiError(400, "user not found");
    }
    // Convert start and end dates to Asia/Karachi time and then to UTC before saving
    // const startDateObj = moment.tz(startDate, "Asia/Karachi").utc().toDate();
    // const endDateObj = moment.tz(endDate, "Asia/Karachi").utc().toDate();

    // Convert dates to Date objects
    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);

    // Check for conflicting bookings
    const existingBookingConflict = await Booking.findOne({
        facility,
        $or: [
            { startDate: { $lt: endDateObj }, endDate: { $gt: startDateObj } }, // Overlaps
            { startDate: { $gte: startDateObj }, endDate: { $lte: endDateObj } }, // Fully overlaps
        ],
    });

    if (existingBookingConflict) {
        console.error("Booking conflict found:", existingBookingConflict);
        throw new apiError(400, "Booking already exists for this facility at the given time");
    }

    // Create and save the new booking
    const newBooking = new Booking({
        facility,
        user,
        startDate: startDateObj,
        endDate: endDateObj,
        conditionsAccepted,
    });

    await newBooking.save();

    // Respond to the client// Populate both user and facility fields
    const populatedBooking = await Booking.findById(newBooking._id)
        .populate([{ path: 'facility', select: 'name description' }, { path: 'user', select: 'name email role' }]);


    // Emit the new booking event to all clients
    const io = req.app.get("io");
    io.emit("booking_created", populatedBooking);
    console.log("New booking created and emitted:", populatedBooking);

    // Respond to the client
    return res.status(201).json(new apiResponse(201, populatedBooking, "Booking created successfully"));
});

const autoCleanUpBookingsController = asyncHandler(async (req, res) => {
    await autoCleanUpBookings(); // Call the shared logic
    return res.status(200).json(new apiResponse(200, null, "Cleanup job executed successfully"));
});
;

const autoCleanUpBookings = async () => {
    try {
        // Get the current time in Asia/Karachi timezone
        const now = moment().tz("Asia/Karachi");

        console.log("Running cleanup job at (Karachi Time):", now.format("YYYY-MM-DD HH:mm:ss"));

        // Fetch expired bookings where endDate <= now
        const expiredBookings = await Booking.find({});

        // Filter out the bookings whose endDate (converted to Karachi time) has passed
        const expiredBookingsFiltered = expiredBookings.filter((booking) => {
            const endDateKarachi = moment(booking.endDate).tz("Asia/Karachi");
            console.log(`Booking ID: ${booking._id} - EndDate in Karachi: ${endDateKarachi.format("YYYY-MM-DD HH:mm:ss")}`);
            return endDateKarachi.isBefore(now);
        });

        if (expiredBookingsFiltered.length === 0) {
            console.log("No expired bookings found.");
            return;
        }

        console.log(`Found ${expiredBookingsFiltered.length} expired bookings.`);

        // Move expired bookings to BookingHistory
        const bookingHistories = expiredBookingsFiltered.map((booking) => ({
            ...booking.toObject(),
            deletedAt: now.toDate(),
        }));

        await BookingHistory.insertMany(bookingHistories);

        // Delete expired bookings from the Booking collection
        const bookingIds = expiredBookingsFiltered.map((booking) => booking._id);
        await Booking.deleteMany({ _id: { $in: bookingIds } });

        console.log(`Moved ${expiredBookingsFiltered.length} bookings to history and deleted them.`);
    } catch (error) {
        console.error("Error during booking cleanup:", error);
    }
};




const getBookingHistoryController = asyncHandler(async (req, res) => {
    // Fetch all booking history``
    const bookingHistory = await BookingHistory.find()
        .populate([{ path: "facility", select: "name description" }, { path: "user", select: "name email role" }])
        .sort({ deletedAt: -1 }); // Sort by the most recently deleted

    return res.status(200).json(new apiResponse(200, bookingHistory, "Booking history fetched successfully"));
});

// Get all bookings
const getBookingsController = asyncHandler(async (req, res) => {
    const io = req.app.get("io"); // Access the Socket.IO instance

    // Fetch all bookings including userdata and facilitydata
    const bookings = await Booking.find().populate("user", "_id name email role").populate("facility", "name description");

    // Emit the bookings to all connected clients
    io.emit("bookings_list", bookings);

    // Respond to the client with the booking data
    return res.status(200).json(new apiResponse(200, bookings, "Bookings retrieved successfully"));
});

// Get a specific booking by ID
const getBookingByIdController = asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Fetch the booking by ID
    const booking = await Booking.findById(id).populate("user").exec();

    if (!booking) {
        throw new apiError(404, "Booking not found");
    }

    // Emit the specific booking to the client who requested it
    const io = req.app.get("io");
    io.emit("booking_details", booking);

    // Respond to the client with the booking details
    return res.status(200).json(new apiResponse(200, booking, "Booking retrieved successfully"));
});

export { createBookingController, getBookingsController, getBookingByIdController, autoCleanUpBookingsController, autoCleanUpBookings, getBookingHistoryController };
