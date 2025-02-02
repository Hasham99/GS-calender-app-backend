import { Booking } from "../models/booking.model.js";  // Importing the Booking model
import { Facility } from "../models/facility.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { apiResponse } from "../utils/apiResponse.js";
import { apiError } from "../utils/apiError.js";
import { User } from "../models/user.model.js";
import { BookingHistory } from "../models/bookingHistory.model.js";
import moment from "moment-timezone";
import colors from "colors";
import { sendEmail } from "../utils/emailService.js";
import cron from "node-cron";


colors.enable();
// Get all bookings
const getBookingsControllerPer = asyncHandler(async (req, res) => {
    const bookings = await Booking.find().populate("user", "name email").populate("facility", "name description"); // Populate user and facility details
    return res.status(200).json(new apiResponse(200, bookings, "Bookings fetched successfully"));
});

const createBookingController = asyncHandler(async (req, res) => {
    const { clientId, facility, user, startDate, endDate, conditionsAccepted } = req.body;

    // Debugging incoming data
    // console.log("Incoming booking request:", req.body);
    console.log("Incoming booking request:");

    // Validate required fields
    if (!clientId || !facility || !user || !startDate || !endDate || conditionsAccepted === undefined) {
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
        // console.error("Booking conflict found:", existingBookingConflict);
        console.error("Booking conflict found:".bgRed.white);
        throw new apiError(400, "Booking already exists for this facility at the given time");
    }

    // Create and save the new booking
    const newBooking = new Booking({
        clientId,
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
    console.log("New booking created and emitted:".bgGreen.white, populatedBooking._id);

    // Send confirmation email to the user
    const emailSent = await sendEmail(
        userExists.email,
        "Booking Confirmation",
        `Hello ${userExists.name},\n\nYour booking has been successfully created.\n\nBooking details:\nFacility: ${facilityExists.name}\nStart Date: ${startDateObj.toLocaleString()}\nEnd Date: ${endDateObj.toLocaleString()}\n\nThank you for using our service!`
    );

    if (!emailSent) {
        console.error("Failed to send confirmation email.");
    }

    // Schedule an email reminder 6 hours before the booking
    const sixHoursBefore = new Date(startDateObj).getTime() - 6 * 60 * 60 * 1000; // 6 hours before booking
    const currentTime = new Date().getTime();
    const delay = sixHoursBefore - currentTime; // Calculate delay in milliseconds

    if (delay > 0) {
        setTimeout(async () => {
            const emailSentReminder = await sendEmail(
                userExists.email,
                "Booking Reminder - 6 Hours Before",
                `Hello ${userExists.name},\n\nThis is a reminder that your booking is starting in 6 hours.\n\nBooking details:\nFacility: ${facilityExists.name}\nStart Date: ${startDateObj.toLocaleString()}\nEnd Date: ${endDateObj.toLocaleString()}\n\nWe look forward to seeing you soon!`
            );

            if (!emailSentReminder) {
                console.error("Failed to send 6 hours before reminder email.");
            }
        }, delay);
    } else {
        console.error("The 6-hour reminder time has already passed. Reminder not scheduled.");
    }

    // Respond to the client
    return res.status(201).json(new apiResponse(201, populatedBooking, "Booking created successfully"));
});

const autoCleanUpBookingsController = asyncHandler(async (req, res) => {
    await autoCleanUpBookings(); // Call the shared logic
    return res.status(200).json(new apiResponse(200, null, "Cleanup job executed successfully"));
});


const autoCleanUpBookings = async () => {
    try {
        // Get the current time in Karachi timezone
        const nowKarachi = moment().tz("Asia/Karachi");

        console.log(`Running cleanup job at (Karachi Time): ${nowKarachi.format("YYYY-MM-DD HH:mm:ss")}`.bgYellow.white);

        // Fetch all bookings from the database
        const bookings = await Booking.find({}).lean(); // Use .lean() to return plain JS objects

        for (const booking of bookings) {
            const endDate = moment(booking.endDate);

            if (endDate.isSameOrBefore(nowKarachi)) {
                console.log(`Booking ID: ${booking._id} is expired. Moving to history and deleting.`.yellow);

                // Ensure references are correctly copied
                const bookingHistory = new BookingHistory({
                    clientId: booking.clientId || null, // Ensure it's preserved
                    facility: booking.facility || null,
                    user: booking.user || null,
                    startDate: booking.startDate,
                    endDate: booking.endDate,
                    status: booking.status,
                    conditionsAccepted: booking.conditionsAccepted,
                    deletedAt: nowKarachi.toDate(),
                });

                // Save to history
                await bookingHistory.save();

                // Delete the booking from the main collection
                await Booking.deleteOne({ _id: booking._id });

                console.log(`Booking ID: ${booking._id} has been deleted.`.bgRed.white);
            }
        }
    } catch (error) {
        console.error("Error during booking cleanup:", error);
    }
};


// const autoCleanUpBookings = async () => {
//     try {
//         // Get the current time in Karachi timezone
//         const nowKarachi = moment().tz("Asia/Karachi");

//         console.log(`Running cleanup job at (Karachi Time): ${nowKarachi.format("YYYY-MM-DD HH:mm:ss")}`.bgYellow.white);

//         // Fetch all bookings from the database
//         const bookings = await Booking.find({});

//         // Loop through each booking and check if it should be deleted
//         for (const booking of bookings) {
//             // Get the booking's endDate (from the database, no manipulation needed)
//             const endDate = moment(booking.endDate); // Just use the stored endDate

//             // Check if the endDate is same or before the current Karachi time
//             console.log(`Checking booking ID endDate: ${booking._id}`.bgWhite.black);
//             // Check if the endDate is same or before the current Karachi time
//             // console.log(`Checking booking ID endDate: ${booking._id}, End Date: ${endDate.format("YYYY-MM-DD HH:mm:ss")}, Now (Karachi): ${nowKarachi.format("YYYY-MM-DD HH:mm:ss")}`.bgWhite.black);

//             if (endDate.isSameOrBefore(nowKarachi)) {
//                 console.log(`Booking ID: ${booking._id} is expired. Moving to history and deleting.`.yellow);

//                 // Move expired booking to history
//                 const bookingHistory = new BookingHistory({
//                     ...booking.toObject(),
//                     deletedAt: nowKarachi.toDate(),
//                 });

//                 // Save to history
//                 await bookingHistory.save();

//                 // Delete the booking from the main collection
//                 await Booking.deleteOne({ _id: booking._id });

//                 console.log(`Booking ID: ${booking._id} has been deleted.`.bgRed.white);
//             }
//         }
//     } catch (error) {
//         console.error("Error during booking cleanup:", error);
//     }
// };

const getBookingHistoryController = asyncHandler(async (req, res) => {
    // Fetch all booking history``
    const bookingHistory = await BookingHistory.find()
        .populate([{ path: "facility", select: "name description" }, { path: "user", select: "name email role" }])
        .sort({ deletedAt: -1 }); // Sort by the most recently deleted

    return res.status(200).json(new apiResponse(200, bookingHistory, "Booking history fetched successfully"));
});

const getBookingHistoryByIdController = asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Find the booking history by ID and populate related fields
    const bookingHistory = await BookingHistory.findById(id)
        .populate([{ path: "facility", select: "name description" }, { path: "user", select: "name email role" }]);

    if (!bookingHistory) {
        return res.status(404).json(new apiResponse(404, null, "Booking history not found"));
    }

    return res.status(200).json(new apiResponse(200, bookingHistory, "Booking history fetched successfully"));
});

const getBookingHistoryByUserIdController = asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Find all booking history records for the given user ID
    const bookingHistory = await BookingHistory.find({ user: id })
        .populate([{ path: "facility", select: "name description" }, { path: "user", select: "name email role" }])
        .sort({ deletedAt: -1 }); // Sort by most recently deleted

    if (!bookingHistory || bookingHistory.length === 0) {
        return res.status(404).json(new apiResponse(404, [], "No booking history found for this user"));
    }

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

export { createBookingController, getBookingsController, getBookingByIdController, autoCleanUpBookingsController, autoCleanUpBookings, getBookingHistoryController, getBookingHistoryByIdController, getBookingHistoryByUserIdController };
