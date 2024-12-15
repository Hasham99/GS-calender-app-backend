import { Booking } from "../models/booking.model.js";  // Importing the Booking model
import { Facility } from "../models/facility.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { apiResponse } from "../utils/apiResponse.js";
import { apiError } from "../utils/apiError.js";

// Get all bookings
const getBookingsControllerPer = asyncHandler(async (req, res) => {
    const bookings = await Booking.find().populate("user", "name email").populate("facility", "name description"); // Populate user and facility details
    return res.status(200).json(new apiResponse(200, bookings, "Bookings fetched successfully"));
});
// Create a new booking
const createBookingControllerPermanent = asyncHandler(async (req, res) => {
    const { facility, user, startDate, endDate, conditionsAccepted } = req.body;

    // // Log the incoming request body for debugging
    // console.log("Incoming request body:", req.body);

    // Validate required fields
    if (!facility || !user || !startDate || !endDate || conditionsAccepted === undefined) {
        throw new apiError(400, "All fields are required");
    }

    // Ensure the start date is before the end date
    if (new Date(startDate) >= new Date(endDate)) {
        throw new apiError(400, "Start date must be before the end date");
    }

    // Check if the facility exists
    const facilityExists = await Facility.findById(facility);
    if (!facilityExists) {
        throw new apiError(400, "Facility not found");
    }

    // Parse the start and end dates into proper Date objects
    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);

    // Check for existing bookings on the same facility that conflict with the selected time
    const existingBookingConflict = await Booking.findOne({
        facility, // Match the same facility
        $or: [
            {
                // Case 1: New booking starts before an existing booking ends
                startDate: { $lt: endDateObj },
                endDate: { $gt: startDateObj },
            },
            {
                // Case 2: New booking fully overlaps an existing booking
                startDate: { $gte: startDateObj },
                endDate: { $lte: endDateObj },
            },
        ],
    });

    if (existingBookingConflict) {
        // console.error("Booking conflict found:", existingBookingConflict);
        throw new apiError(400, "Booking already exists for this facility at the given time");
    }

    // Create the new booking
    const newBooking = new Booking({
        facility,
        user,
        startDate: startDateObj,
        endDate: endDateObj,
        conditionsAccepted,
    });

    // Save the new booking to the database
    await newBooking.save();

    // Return the successful response
    return res.status(201).json(new apiResponse(201, newBooking, "Booking created successfully"));
});

// Export the controller functions
const createBookingController01 = asyncHandler(async (req, res) => {
    const { facility, user, startDate, endDate, conditionsAccepted } = req.body;

    if (!facility || !user || !startDate || !endDate || conditionsAccepted === undefined) {
        throw new apiError(400, "All fields are required");
    }

    if (new Date(startDate) >= new Date(endDate)) {
        throw new apiError(400, "Start date must be before the end date");
    }

    const facilityExists = await Facility.findById(facility);
    if (!facilityExists) {
        throw new apiError(400, "Facility not found");
    }

    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);

    const existingBookingConflict = await Booking.findOne({
        facility,
        $or: [
            { startDate: { $lt: endDateObj }, endDate: { $gt: startDateObj } },
            { startDate: { $gte: startDateObj }, endDate: { $lte: endDateObj } },
        ],
    });

    if (existingBookingConflict) {
        throw new apiError(400, "Booking already exists for this facility at the given time");
    }

    const newBooking = new Booking({
        facility,
        user,
        startDate: startDateObj,
        endDate: endDateObj,
        conditionsAccepted,
    });

    await newBooking.save();

    // Emit the new booking event
    const io = req.app.get("io"); // Get Socket.IO instance from the app
    io.emit("booking_created", newBooking); // Emit to all connected clients

    return res.status(201).json(new apiResponse(201, newBooking, "Booking created successfully"));
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

    // Emit the new booking event to all clients
    const io = req.app.get("io");
    io.emit("booking_created", newBooking);
    console.log("New booking created and emitted:", newBooking);

    // Respond to the client
    return res.status(201).json(new apiResponse(201, newBooking, "Booking created successfully"));
});


// Get all bookings
const getBookingsController = asyncHandler(async (req, res) => {
    const io = req.app.get("io"); // Access the Socket.IO instance

    // Fetch all bookings
    const bookings = await Booking.find().populate("user").exec();

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

export { createBookingController, getBookingsController, getBookingByIdController };
