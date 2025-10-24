import { Booking } from "../models/booking.model.js"; // Importing the Booking model
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
import { getLimitationForUserFacility } from "./limitation.controller.js";
import { BookingLog } from "../models/BookingLog.model.js";

colors.enable();
// Get all bookings
const getBookingsControllerPer = asyncHandler(async (req, res) => {
  const bookings = await Booking.find()
    .populate("user", "name email")
    .populate("facility", "name description"); // Populate user and facility details
  return res
    .status(200)
    .json(new apiResponse(200, bookings, "Bookings fetched successfully"));
});

const createBookingController23July25 = asyncHandler(async (req, res) => {
  const { clientId, facility, user, startDate, endDate, conditionsAccepted } =
    req.body;
  try {
    // Validate required fields
    if (
      !clientId ||
      !facility ||
      !user ||
      !startDate ||
      !endDate ||
      conditionsAccepted === undefined
    ) {
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
      throw new apiError(400, "User not found");
    }

    // Fetch user-specific booking limitations using the new limitation controller
    const limitation = await getLimitationForUserFacility(
      clientId,
      user,
      facility
    );

    // Set default limitations if not found
    const maxWeeksAdvance = limitation ? limitation.maxWeeksAdvance : 4; // Default: 4 weeks
    const maxBookingsPerWeek = limitation ? limitation.maxBookingsPerWeek : 3; // Default: 3 bookings

    // Convert dates to Date objects
    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);
    const currentDate = new Date();

    // Check if booking is within the allowed advance weeks
    const maxAllowedDate = moment(currentDate)
      .add(maxWeeksAdvance, "weeks")
      .toDate();
    if (startDateObj > maxAllowedDate) {
      throw new apiError(
        400,
        `You can only book up to ${maxWeeksAdvance} weeks in advance.`
      );
    }

    // Check user's weekly booking limit
    const startOfWeek = moment(startDateObj).startOf("isoWeek").toDate();
    const endOfWeek = moment(startDateObj).endOf("isoWeek").toDate();

    const userBookingsThisWeek = await Booking.countDocuments({
      user,
      startDate: { $gte: startOfWeek, $lte: endOfWeek },
    });

    if (userBookingsThisWeek >= maxBookingsPerWeek) {
      throw new apiError(
        400,
        `You can only have ${maxBookingsPerWeek} bookings per week.`
      );
    }

    // Check for conflicting bookings
    const existingBookingConflict = await Booking.findOne({
      facility,
      $or: [
        { startDate: { $lt: endDateObj }, endDate: { $gt: startDateObj } }, // Overlaps
        { startDate: { $gte: startDateObj }, endDate: { $lte: endDateObj } }, // Fully overlaps
      ],
    });

    if (existingBookingConflict) {
      console.error("Booking conflict found:");
      throw new apiError(
        400,
        "Booking already exists for this facility at the given time"
      );
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

    // Populate both user and facility fields
    const populatedBooking = await Booking.findById(newBooking._id).populate([
      { path: "facility", select: "name description" },
      { path: "user", select: "name email role" },
    ]);

    // Emit the new booking event to all clients
    const io = req.app.get("io");
    io.emit("booking_created", populatedBooking);
    console.log("New booking created and emitted:", populatedBooking._id);

    // Format dates for email and Google Calendar
    const formattedStartDate = moment
      .utc(startDateObj)
      .tz("Asia/Karachi")
      .format("YYYY-MM-DD hh:mm A");
    const formattedEndDate = moment
      .utc(endDateObj)
      .tz("Asia/Karachi")
      .format("YYYY-MM-DD hh:mm A");

    // Format for Google Calendar (UTC)
    const startUtcISO =
      moment.utc(startDateObj).format("YYYYMMDDTHHmmss") + "Z";
    const endUtcISO = moment.utc(endDateObj).format("YYYYMMDDTHHmmss") + "Z";

    // Google Calendar Link
    const calendarLink = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
      `Booking at ${facilityExists.name}`
    )}&dates=${startUtcISO}/${endUtcISO}&details=${encodeURIComponent(
      `Booking from ${formattedStartDate} to ${formattedEndDate} (Asia/Karachi Time)\n\nFacility: ${facilityExists.name}`
    )}&location=${encodeURIComponent(
      "https://yourbookingapp.com/facility/" + facilityExists._id
    )}&sf=true&output=xml`;

    const emailHtml = `
      <div style="margin:0; padding:0; background-color:#f6f9fc;">
        <center style="width:100%; table-layout:fixed; background-color:#f6f9fc; padding:20px 0;">
          <div style="max-width:600px; margin:0 auto; background-color:#ffffff; border-radius:8px; border:1px solid #ddd; font-family:Arial, sans-serif;">
            <table cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;">
              <tr>
                <td style="padding:30px;">
                  <h2 style="color:#333333; text-align:center; font-size:22px; margin:0 0 20px;">Booking Confirmation</h2>
                  <p style="font-size:16px; color:#333; margin:0 0 10px;">Hello <strong>${userExists.name}</strong>,</p>
                  <p style="font-size:16px; color:#333; margin:0 0 20px;">
                    Your booking has been <strong>successfully created</strong>. Below are your booking details:
                  </p>

                  <table width="100%" cellpadding="10" cellspacing="0" border="0" style="background-color:#fafafa; border:1px solid #e1e1e1; border-radius:6px; margin:0 0 30px;">
                    <tr>
                      <td style="font-size:15px;"><strong>Facility:</strong> ${facilityExists.name}</td>
                    </tr>
                    <tr>
                      <td style="font-size:15px;"><strong>Start Date (Asia/Karachi):</strong> ${formattedStartDate}</td>
                    </tr>
                    <tr>
                      <td style="font-size:15px;"><strong>End Date (Asia/Karachi):</strong> ${formattedEndDate}</td>
                    </tr>
                  </table>

                  <div style="text-align:center; margin-top:20px;">
                    <a href="${calendarLink}" target="_blank" 
                      style="display:inline-block; padding:12px 20px; background-color:#333; color:#fff; text-decoration:none; border-radius:5px; font-size:16px;">
                      <img src="https://www.gstatic.com/calendar/images/dynamiclogo_2020q4/calendar_16_2x.png" 
                          alt="Google Calendar" 
                          style="vertical-align:middle; width:20px; height:20px; margin-right:8px;" />
                      Add to Google Calendar
                    </a>
                  </div>

                  <p style="font-size:14px; color:#888; text-align:center; margin-top:40px;">
                    Thank you for using our service!
                  </p>
                </td>
              </tr>
            </table>
          </div>
        </center>
      </div>
    `;

    const emailSent = await sendEmail(
      userExists.email,
      "Booking Confirmation",
      emailHtml,
      true
    );

    if (!emailSent) {
      console.error("Failed to send confirmation email.");
    }

    // Schedule an email reminder 6 hours before the booking
    const sixHoursBefore =
      new Date(startDateObj).getTime() - 6 * 60 * 60 * 1000; // 6 hours before booking
    const currentTime = new Date().getTime();
    const delay = sixHoursBefore - currentTime; // Calculate delay in milliseconds
    const reminderTimeouts = req.app.get("bookingReminderTimeouts");

    if (delay > 0) {
      const timeoutId = setTimeout(async () => {
        const stillExists = await Booking.findById(newBooking._id);
        if (!stillExists) {
          console.log(
            `Booking ${newBooking._id} was deleted. Skipping reminder email.`
          );
          return;
        }

        const emailSentReminder = await sendEmail(
          userExists.email,
          "Booking Reminder - 6 Hours Before",
          `Hello ${userExists.name},\n\nThis is a reminder that your booking is starting in 6 hours.\n\nBooking details:\nFacility: ${facilityExists.name}\nStart Date: ${formattedStartDate}\nEnd Date: ${formattedEndDate}\n\nWe look forward to seeing you soon!`
        );

        if (!emailSentReminder) {
          console.error("Failed to send 6 hours before reminder email.");
        }

        // Clean up after execution
        reminderTimeouts.delete(newBooking._id.toString());
      }, delay);

      // Store the timeout so we can clear it if the booking is deleted
      reminderTimeouts.set(newBooking._id.toString(), timeoutId);
    } else {
      console.error(
        "The 6-hour reminder time has already passed. Reminder not scheduled."
      );
    }

    // ✅ Log Success
    await BookingLog.create({
      clientId,
      user,
      facility,
      status: "success",
      message: "Booking created successfully",
      data: { bookingId: newBooking._id },
    });

    // Respond to the client
    return res
      .status(201)
      .json(
        new apiResponse(201, populatedBooking, "Booking created successfully")
      );
  } catch (error) {
    // ❌ Log error
    await BookingLog.create({
      clientId,
      user,
      facility,
      status: "error",
      message: error.message,
      data: {
        stack: error.stack,
        startDate,
        endDate,
        conditionsAccepted,
      },
    });

    throw new apiError(error.statusCode || 500, error.message, [], error.stack);
  }
});
const createBookingController19oct25 = asyncHandler(async (req, res) => {
  const { clientId, facility, user, startDate, endDate, conditionsAccepted } = req.body;
  try {
    if (!clientId || !facility || !user || !startDate || !endDate || conditionsAccepted === undefined) {
      throw new apiError(400, "All fields are required");
    }

    if (new Date(startDate) >= new Date(endDate)) {
      throw new apiError(400, "Start date must be before the end date");
    }

    const facilityExists = await Facility.findById(facility);
    if (!facilityExists) {
      throw new apiError(400, "Facility not found");
    }

    const userExists = await User.findById(user);
    if (!userExists) {
      throw new apiError(400, "User not found");
    }

    const limitation = await getLimitationForUserFacility(clientId, user, facility);
    const maxWeeksAdvance = limitation ? limitation.maxWeeksAdvance : 4;
    const maxBookingsPerWeek = limitation ? limitation.maxBookingsPerWeek : 3;

    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);
    const currentDate = new Date();

    const maxAllowedDate = moment(currentDate).add(maxWeeksAdvance, "weeks").toDate();
    if (startDateObj > maxAllowedDate) {
      throw new apiError(400, `You can only book up to ${maxWeeksAdvance} weeks in advance.`);
    }

    const startOfWeek = moment(startDateObj).startOf("isoWeek").toDate();
    const endOfWeek = moment(startDateObj).endOf("isoWeek").toDate();

    const userBookingsThisWeek = await Booking.countDocuments({
      user,
      startDate: { $gte: startOfWeek, $lte: endOfWeek },
    });

    if (userBookingsThisWeek >= maxBookingsPerWeek) {
      throw new apiError(400, `You can only have ${maxBookingsPerWeek} bookings per week.`);
    }

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
      clientId,
      facility,
      user,
      startDate: startDateObj,
      endDate: endDateObj,
      conditionsAccepted,
    });

    await newBooking.save();

    const populatedBooking = await Booking.findById(newBooking._id).populate([
      { path: "facility", select: "name description" },
      { path: "user", select: "name email role" },
    ]);

    const io = req.app.get("io");
    io.emit("booking_created", populatedBooking);

    const formattedStartDate = moment.utc(startDateObj).tz("Asia/Karachi").format("YYYY-MM-DD hh:mm A");
    const formattedEndDate = moment.utc(endDateObj).tz("Asia/Karachi").format("YYYY-MM-DD hh:mm A");
    const startUtcISO = moment.utc(startDateObj).format("YYYYMMDDTHHmmss") + "Z";
    const endUtcISO = moment.utc(endDateObj).format("YYYYMMDDTHHmmss") + "Z";

    const calendarLink = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(`Booking at ${facilityExists.name}`)}&dates=${startUtcISO}/${endUtcISO}&details=${encodeURIComponent(`Booking from ${formattedStartDate} to ${formattedEndDate} (Asia/Karachi Time)\n\nFacility: ${facilityExists.name}`)}&location=${encodeURIComponent("https://yourbookingapp.com/facility/" + facilityExists._id)}&sf=true&output=xml`;

    const emailHtml = `<div style="margin:0; padding:0; background-color:#f6f9fc;"><center style="width:100%; table-layout:fixed; background-color:#f6f9fc; padding:20px 0;"><div style="max-width:600px; margin:0 auto; background-color:#ffffff; border-radius:8px; border:1px solid #ddd; font-family:Arial, sans-serif;"><table cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;"><tr><td style="padding:30px;"><h2 style="color:#333333; text-align:center; font-size:22px; margin:0 0 20px;">Booking Confirmation</h2><p style="font-size:16px; color:#333; margin:0 0 10px;">Hello <strong>${userExists.name}</strong>,</p><p style="font-size:16px; color:#333; margin:0 0 20px;">Your booking has been <strong>successfully created</strong>. Below are your booking details:</p><table width="100%" cellpadding="10" cellspacing="0" border="0" style="background-color:#fafafa; border:1px solid #e1e1e1; border-radius:6px; margin:0 0 30px;"><tr><td style="font-size:15px;"><strong>Facility:</strong> ${facilityExists.name}</td></tr><tr><td style="font-size:15px;"><strong>Start Date (Asia/Karachi):</strong> ${formattedStartDate}</td></tr><tr><td style="font-size:15px;"><strong>End Date (Asia/Karachi):</strong> ${formattedEndDate}</td></tr></table><div style="text-align:center; margin-top:20px;"><a href="${calendarLink}" target="_blank" style="display:inline-block; padding:12px 20px; background-color:#333; color:#fff; text-decoration:none; border-radius:5px; font-size:16px;"><img src="https://www.gstatic.com/calendar/images/dynamiclogo_2020q4/calendar_16_2x.png" alt="Google Calendar" style="vertical-align:middle; width:20px; height:20px; margin-right:8px;" />Add to Google Calendar</a></div><p style="font-size:14px; color:#888; text-align:center; margin-top:40px;">Thank you for using our service!</p></td></tr></table></div></center></div>`;

    const emailSent = await sendEmail(userExists.email, "Booking Confirmation", emailHtml, true);
    if (!emailSent) {
      console.error("Failed to send confirmation email.");
    }

    const sixHoursBefore = new Date(startDateObj).getTime() - 6 * 60 * 60 * 1000;
    const currentTime = new Date().getTime();
    const delay = sixHoursBefore - currentTime;
    // const reminderTimeouts = req.app.get("bookingReminderTimeouts");

    if (delay > 0) {
      const timeoutId = setTimeout(async () => {
        const stillExists = await Booking.findById(newBooking._id);
        if (!stillExists) {
          console.log(`Booking ${newBooking._id} was deleted. Skipping reminder email.`);
          return;
        }
        const reminderEmailHtml = `<div style="margin:0; padding:0; background-color:#f6f9fc;"><center style="width:100%; table-layout:fixed; background-color:#f6f9fc; padding:20px 0;"><div style="max-width:600px; margin:0 auto; background-color:#ffffff; border-radius:8px; border:1px solid #ddd; font-family:Arial, sans-serif;"><table cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;"><tr><td style="padding:30px;"><h2 style="color:#333333; text-align:center; font-size:22px; margin:0 0 20px;">Booking Reminder</h2><p style="font-size:16px; color:#333; margin:0 0 10px;">Hello <strong>${userExists.name}</strong>,</p><p style="font-size:16px; color:#333; margin:0 0 20px;">This is a friendly reminder that your booking is starting in <strong>6 hours</strong>. Below are the details:</p><table width="100%" cellpadding="10" cellspacing="0" border="0" style="background-color:#fafafa; border:1px solid #e1e1e1; border-radius:6px; margin:0 0 30px;"><tr><td style="font-size:15px;"><strong>Facility:</strong> ${facilityExists.name}</td></tr><tr><td style="font-size:15px;"><strong>Start Date (Asia/Karachi):</strong> ${formattedStartDate}</td></tr><tr><td style="font-size:15px;"><strong>End Date (Asia/Karachi):</strong> ${formattedEndDate}</td></tr></table><p style="font-size:14px; color:#888; text-align:center; margin-top:40px;">Thank you for choosing our service. We look forward to seeing you!</p></td></tr></table></div></center></div>`;

        const emailSentReminder = await sendEmail(userExists.email, "Booking Reminder - 6 Hours Before", reminderEmailHtml, true);
        if (!emailSentReminder) {
          console.error("Failed to send 6 hours before reminder email.");
        }
        // reminderTimeouts.delete(newBooking._id.toString());
      }, delay);
      // reminderTimeouts.set(newBooking._id.toString(), timeoutId);
    } else {
      console.error("The 6-hour reminder time has already passed. Reminder not scheduled.");
    }

    await BookingLog.create({
      clientId,
      user,
      facility,
      status: "success",
      message: "Booking created successfully",
      data: { bookingId: newBooking._id },
    });

    return res.status(201).json(new apiResponse(201, populatedBooking, "Booking created successfully"));
  } catch (error) {
    await BookingLog.create({
      clientId,
      user,
      facility,
      status: "error",
      message: error.message,
      data: {
        stack: error.stack,
        startDate,
        endDate,
        conditionsAccepted,
      },
    });
    throw new apiError(error.statusCode || 500, error.message, [], error.stack);
  }
});

const createBookingController23Oct25 = asyncHandler(async (req, res) => {
  const { clientId, facility, user, startDate, endDate, conditionsAccepted } = req.body;

  if (!clientId || !facility || !user || !startDate || !endDate || conditionsAccepted === undefined) {
    throw new apiError(400, "All fields are required");
  }

  if (new Date(startDate) >= new Date(endDate)) {
    throw new apiError(400, "Start date must be before the end date");
  }

  const facilityExists = await Facility.findById(facility);
  if (!facilityExists) throw new apiError(404, "Facility not found");

  const userExists = await User.findById(user);
  if (!userExists) throw new apiError(404, "User not found");

  // ✅ Get limitation rules for this user and facility
  const limitation = await getLimitationForUserFacility(clientId, user, facility);

  const { maxWeeksAdvance, maxBookingsPerWeek, maxBookingsPerMonth } = limitation;

  const startDateObj = new Date(startDate);
  const endDateObj = new Date(endDate);
  const currentDate = new Date();

  // ✅ 1️⃣ Check max advance booking limit
  const maxAllowedDate = moment(currentDate).add(maxWeeksAdvance, "weeks").toDate();
  if (startDateObj > maxAllowedDate) {
    throw new apiError(
      400,
      `You can only book up to ${maxWeeksAdvance} weeks in advance.`
    );
  }

  // ✅ 2️⃣ Check weekly booking limit
  const startOfWeek = moment(startDateObj).startOf("isoWeek").toDate();
  const endOfWeek = moment(startDateObj).endOf("isoWeek").toDate();

  const userBookingsThisWeek = await Booking.countDocuments({
    clientId,
    user,
    facility,
    startDate: { $gte: startOfWeek, $lte: endOfWeek },
  });

  if (userBookingsThisWeek >= maxBookingsPerWeek) {
    throw new apiError(
      400,
      `You can only have ${maxBookingsPerWeek} bookings per week for this facility.`
    );
  }

  // ✅ 3️⃣ Check monthly booking limit
  const startOfMonth = moment(startDateObj).startOf("month").toDate();
  const endOfMonth = moment(startDateObj).endOf("month").toDate();

  const userBookingsThisMonth = await Booking.countDocuments({
    clientId,
    user,
    facility,
    startDate: { $gte: startOfMonth, $lte: endOfMonth },
  });

  if (userBookingsThisMonth >= maxBookingsPerMonth) {
    throw new apiError(
      400,
      `You can only have ${maxBookingsPerMonth} bookings per month for this facility.`
    );
  }

  // ✅ 4️⃣ Check for time conflict with other bookings
  const existingBookingConflict = await Booking.findOne({
    clientId,
    facility,
    $or: [
      { startDate: { $lt: endDateObj }, endDate: { $gt: startDateObj } },
      { startDate: { $gte: startDateObj }, endDate: { $lte: endDateObj } },
    ],
  });

  if (existingBookingConflict) {
    throw new apiError(400, "This time slot is already booked for this facility.");
  }

  // ✅ 5️⃣ If all checks pass, create the booking
  const newBooking = await Booking.create({
    clientId,
    facility,
    user,
    startDate: startDateObj,
    endDate: endDateObj,
    conditionsAccepted,
  });

  const populatedBooking = await Booking.findById(newBooking._id).populate([
    { path: "facility", select: "name description" },
    { path: "user", select: "name email role" },
  ]);

  return res
    .status(201)
    .json(new apiResponse(201, populatedBooking, "Booking created successfully"));
});

const createBookingController = asyncHandler(async (req, res) => {
  const { clientId, facility, user, startDate, endDate, conditionsAccepted } = req.body;

  try {
    // 1️⃣ Validate required fields
    if (!clientId || !facility || !user || !startDate || !endDate || conditionsAccepted === undefined)
      throw new apiError(400, "All fields are required");

    // 2️⃣ Validate date logic
    if (new Date(startDate) >= new Date(endDate))
      throw new apiError(400, "Start date must be before the end date");

    // 3️⃣ Validate facility & user
    const facilityExists = await Facility.findById(facility);
    if (!facilityExists) throw new apiError(404, "Facility not found");

    const userExists = await User.findById(user);
    if (!userExists) throw new apiError(404, "User not found");

    // 4️⃣ Get booking limitation rules
    const limitation = await getLimitationForUserFacility(clientId, user, facility);
    const { maxWeeksAdvance, maxBookingsPerWeek, maxBookingsPerMonth } = limitation;

    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);
    const currentDate = new Date();

    // 5️⃣ Check advance weeks
    const maxAllowedDate = moment(currentDate).add(maxWeeksAdvance, "weeks").toDate();
    if (startDateObj > maxAllowedDate)
      throw new apiError(400, `You can only book up to ${maxWeeksAdvance} weeks in advance.`);

    // 6️⃣ Weekly limit
    const startOfWeek = moment(startDateObj).startOf("isoWeek").toDate();
    const endOfWeek = moment(startDateObj).endOf("isoWeek").toDate();
    const weeklyBookings = await Booking.countDocuments({
      clientId,
      user,
      facility,
      startDate: { $gte: startOfWeek, $lte: endOfWeek },
    });
    if (weeklyBookings >= maxBookingsPerWeek)
      throw new apiError(400, `You can only have ${maxBookingsPerWeek} bookings per week for this facility.`);

    // 7️⃣ Monthly limit
    const startOfMonth = moment(startDateObj).startOf("month").toDate();
    const endOfMonth = moment(startDateObj).endOf("month").toDate();
    const monthlyBookings = await Booking.countDocuments({
      clientId,
      user,
      facility,
      startDate: { $gte: startOfMonth, $lte: endOfMonth },
    });
    if (monthlyBookings >= maxBookingsPerMonth)
      throw new apiError(400, `You can only have ${maxBookingsPerMonth} bookings per month for this facility.`);

    // 8️⃣ Time conflict check
    const conflict = await Booking.findOne({
      clientId,
      facility,
      $or: [
        { startDate: { $lt: endDateObj }, endDate: { $gt: startDateObj } },
        { startDate: { $gte: startDateObj }, endDate: { $lte: endDateObj } },
      ],
    });
    if (conflict) throw new apiError(400, "This time slot is already booked for this facility.");

    // 9️⃣ Create booking
    const newBooking = await Booking.create({
      clientId,
      facility,
      user,
      startDate: startDateObj,
      endDate: endDateObj,
      conditionsAccepted,
    });

    const populatedBooking = await Booking.findById(newBooking._id).populate([
      { path: "facility", select: "name description" },
      { path: "user", select: "name email role" },
    ]);

    // 🔟 Emit via Socket.IO
    const io = req.app.get("io");
    if (io) {
      io.emit("booking_created", populatedBooking);
      console.log("✅ Socket emitted for booking:", populatedBooking._id);
    }

    // 1️⃣1️⃣ Send booking confirmation email
    const formattedStartDate = moment.utc(startDateObj).tz("Asia/Karachi").format("YYYY-MM-DD hh:mm A");
    const formattedEndDate = moment.utc(endDateObj).tz("Asia/Karachi").format("YYYY-MM-DD hh:mm A");
    const startUtcISO = moment.utc(startDateObj).format("YYYYMMDDTHHmmss") + "Z";
    const endUtcISO = moment.utc(endDateObj).format("YYYYMMDDTHHmmss") + "Z";

    const calendarLink = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
      `Booking at ${facilityExists.name}`
    )}&dates=${startUtcISO}/${endUtcISO}&details=${encodeURIComponent(
      `Booking from ${formattedStartDate} to ${formattedEndDate} (Asia/Karachi)\nFacility: ${facilityExists.name}`
    )}&sf=true&output=xml`;

    const emailHtml = `
      <div style="margin:0; padding:0; background-color:#f6f9fc;">
        <center style="width:100%; table-layout:fixed; background-color:#f6f9fc; padding:20px 0;">
          <div style="max-width:600px; margin:0 auto; background-color:#ffffff; border-radius:8px; border:1px solid #ddd; font-family:Arial, sans-serif;">
            <table cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;">
              <tr>
                <td style="padding:30px;">
                  <h2 style="color:#333333; text-align:center; font-size:22px; margin:0 0 20px;">Booking Confirmation</h2>
                  <p style="font-size:16px; color:#333; margin:0 0 10px;">Hello <strong>${userExists.name}</strong>,</p>
                  <p style="font-size:16px; color:#333; margin:0 0 20px;">
                    Your booking has been <strong>successfully created</strong>. Below are your booking details:
                  </p>

                  <table width="100%" cellpadding="10" cellspacing="0" border="0" style="background-color:#fafafa; border:1px solid #e1e1e1; border-radius:6px; margin:0 0 30px;">
                    <tr>
                      <td style="font-size:15px;"><strong>Facility:</strong> ${facilityExists.name}</td>
                    </tr>
                    <tr>
                      <td style="font-size:15px;"><strong>Start Date (Asia/Karachi):</strong> ${formattedStartDate}</td>
                    </tr>
                    <tr>
                      <td style="font-size:15px;"><strong>End Date (Asia/Karachi):</strong> ${formattedEndDate}</td>
                    </tr>
                  </table>

                  <div style="text-align:center; margin-top:20px;">
                    <a href="${calendarLink}" target="_blank" 
                      style="display:inline-block; padding:12px 20px; background-color:#333; color:#fff; text-decoration:none; border-radius:5px; font-size:16px;">
                      <img src="https://www.gstatic.com/calendar/images/dynamiclogo_2020q4/calendar_16_2x.png" 
                          alt="Google Calendar" 
                          style="vertical-align:middle; width:20px; height:20px; margin-right:8px;" />
                      Add to Google Calendar
                    </a>
                  </div>

                  <p style="font-size:14px; color:#888; text-align:center; margin-top:40px;">
                    Thank you for using our service!
                  </p>
                </td>
              </tr>
            </table>
          </div>
        </center>
      </div>
    `;

    await sendEmail(userExists.email, "Booking Confirmation", emailHtml, true);


    // // 1️⃣2️⃣ Schedule reminder (6 hours before)
    // const reminderTimeouts = req.app.get("bookingReminderTimeouts");
    // const sixHoursBefore = startDateObj.getTime() - 6 * 60 * 60 * 1000;
    // const delay = sixHoursBefore - Date.now();

    // if (delay > 0) {
    //   const timeoutId = setTimeout(async () => {
    //     const stillExists = await Booking.findById(newBooking._id);
    //     if (!stillExists) return console.log("Booking deleted, skipping reminder.");

    //     await sendEmail(
    //       userExists.email,
    //       "Booking Reminder - 6 Hours Left",
    //       `Hello ${userExists.name},\n\nThis is a reminder that your booking starts in 6 hours.\n\nFacility: ${facilityExists.name}\nStart: ${formattedStartDate}`
    //     );

    //     reminderTimeouts.delete(newBooking._id.toString());
    //   }, delay);

    //   reminderTimeouts.set(newBooking._id.toString(), timeoutId);
    // }

    // 1️⃣3️⃣ Log success
    await BookingLog.create({
      clientId,
      user,
      facility,
      status: "success",
      message: "Booking created successfully",
      data: { bookingId: newBooking._id },
    });
    // ✅ After successfully creating the booking
    await BookingHistory.create({
      bookingId: newBooking._id,          // Reference to the active booking
      clientId: newBooking.clientId,
      facility: newBooking.facility,
      user: newBooking.user,
      startDate: newBooking.startDate,
      endDate: newBooking.endDate,
      status: "pending",                  // Always pending at creation
      conditionsAccepted: newBooking.conditionsAccepted,
    });

    console.log(`🟡 Booking added to history (pending): ${newBooking._id}`);


    return res
      .status(201)
      .json(new apiResponse(201, populatedBooking, "Booking created successfully"));
  } catch (error) {
    // ❌ Log and throw
    await BookingLog.create({
      clientId,
      user,
      facility,
      status: "error",
      message: error.message,
      data: { stack: error.stack, startDate, endDate, conditionsAccepted },
    });
    throw new apiError(error.statusCode || 500, error.message, [], error.stack);
  }
});

const testEmailTemplateController = asyncHandler(async (req, res) => {
  // Dummy data
  const userExists = { name: "Test User", email: "hashamullah.dev@gmail.com" };
  const facilityExists = { name: "Test Facility", id: "abc123" };

  const inputTimezone = "Asia/Karachi";

  // Test booking time in Asia/Karachi
  const startDateLocal = moment.tz(
    "2025-06-11 06:30",
    "YYYY-MM-DD HH:mm",
    inputTimezone
  );
  const endDateLocal = startDateLocal.clone().add(1, "hour");

  // Format for display
  const formattedStartDate = startDateLocal.format("YYYY-MM-DD hh:mm A z");
  const formattedEndDate = endDateLocal.format("YYYY-MM-DD hh:mm A z");

  // Format for Google Calendar link (UTC ISO 8601)
  const startUtcISO =
    startDateLocal.clone().utc().format("YYYYMMDDTHHmmss") + "Z";
  const endUtcISO = endDateLocal.clone().utc().format("YYYYMMDDTHHmmss") + "Z";

  const calendarLink = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
    "Booking at " + facilityExists.name
  )}&dates=${startUtcISO}/${endUtcISO}&details=${encodeURIComponent(
    `Booking at ${facilityExists.name} from ${formattedStartDate} to ${formattedEndDate} (${inputTimezone})`
  )}&location=${encodeURIComponent(
    `https://yourbookingapp.com/facility/${facilityExists.id}`
  )}&sf=true&output=xml`;

  // Email HTML content
  const emailHtml01 = `
    <div style="font-family: Arial, sans-serif;  padding: 20px;">
        <div style="max-width: 80%; margin: auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 10px 0 rgba(0, 0, 0, 0.1), 0 2px 10px 0 rgba(0, 0, 0, 0.1) !important; padding: 30px;">
        <h2 style="color: #333333; text-align: center;">Booking Confirmation</h2>
        <p style="font-size: 16px; color: #333;">Hello <strong>${userExists.name}</strong>,</p>
        <p style="font-size: 16px; color: #333;">
            Your booking has been <strong>successfully created</strong>. Below are your booking details:
        </p>

        <div style="border: 1px solid #e1e1e1; border-radius: 6px; padding: 15px; margin: 20px 0; background-color: #fafafa;">
            <p style="margin: 0; font-size: 15px;"><strong>Facility:</strong> ${facilityExists.name}</p>
            <p style="margin: 0; font-size: 15px;"><strong>Start Date (Asia/Karachi):</strong> ${formattedStartDate}</p>
            <p style="margin: 0; font-size: 15px;"><strong>End Date (Asia/Karachi):</strong> ${formattedEndDate}</p>
        </div>

        <div style="text-align: center; margin-top: 30px;">
            <a href="${calendarLink}" target="_blank" style="display: inline-block; padding: 12px 20px; background-color: #333; color: #fff; text-decoration: none; border-radius: 5px; font-size: 16px;">
            <img src="https://www.gstatic.com/calendar/images/dynamiclogo_2020q4/calendar_16_2x.png" 
                alt="Google Calendar" 
                style="vertical-align: middle; width: 24px; height: 24px; margin-right: 8px;" />
            Add to Google Calendar
            </a>
        </div>

        <p style="font-size: 14px; color: #888; text-align: center; margin-top: 40px;">
            Thank you for using our service!
        </p>
        </div>
    </div>
    `;
  const emailHtml = `
  <div style="font-family: Arial, sans-serif; padding: 20px;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; margin: auto; background-color: #ffffff; border-radius: 8px; border: 1px solid #ddd;">
      <tr>
        <td style="padding: 30px;">
          <h2 style="color: #333333; text-align: center;">Booking Confirmation</h2>
          <p style="font-size: 16px; color: #333;">Hello <strong>${userExists.name}</strong>,</p>
          <p style="font-size: 16px; color: #333;">
            Your booking has been <strong>successfully created</strong>. Below are your booking details:
          </p>

          <table width="100%" cellpadding="10" cellspacing="0" border="0" style="background-color: #fafafa; border: 1px solid #e1e1e1; border-radius: 6px; margin: 12px 0; line-height: 1;">
            <tr><td style="font-size: 15px;"><strong>Facility:</strong> ${facilityExists.name}</td></tr>
            <tr><td style="font-size: 15px;"><strong>Start Date (Asia/Karachi):</strong> ${formattedStartDate}</td></tr>
            <tr><td style="font-size: 15px;"><strong>End Date (Asia/Karachi):</strong> ${formattedEndDate}</td></tr>
          </table>

          <div style="text-align: center; margin-top: 30px;">
            <a href="${calendarLink}" target="_blank" style="display: inline-block; padding: 12px 20px; background-color: #333; color: #fff; text-decoration: none; border-radius: 5px; font-size: 16px;">
              <img src="https://www.gstatic.com/calendar/images/dynamiclogo_2020q4/calendar_16_2x.png" 
                   alt="Google Calendar" 
                   style="vertical-align: middle; width: 24px; height: 24px; margin-right: 8px;" />
              Add to Google Calendar
            </a>
          </div>

          <p style="font-size: 14px; color: #888; text-align: center; margin-top: 40px;">
            Thank you for using our service!
          </p>
        </td>
      </tr>
    </table>
  </div>
`;

  const emailSent = await sendEmail(
    userExists.email,
    "Test Booking Confirmation",
    emailHtml,
    true
  );

  if (!emailSent) {
    return res
      .status(500)
      .json({ success: false, message: "Failed to send test email" });
  }

  return res.status(200).json({
    success: true,
    message: `Test email sent successfully to ${userExists.email}`,
  });
});
const updateBookingController = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { facility, startDate, endDate, status, conditionsAccepted } = req.body;

  // Find the booking
  const booking = await Booking.findById(id);
  if (!booking) {
    throw new apiError(404, "Booking not found");
  }

  // Optional: Check for date conflicts if startDate or endDate is being updated
  if (startDate && endDate) {
    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);

    if (startDateObj >= endDateObj) {
      throw new apiError(400, "Start date must be before end date");
    }

    const conflict = await Booking.findOne({
      _id: { $ne: id },
      facility: facility || booking.facility,
      $or: [
        { startDate: { $lt: endDateObj }, endDate: { $gt: startDateObj } },
        { startDate: { $gte: startDateObj }, endDate: { $lte: endDateObj } },
      ],
    });

    if (conflict) {
      throw new apiError(400, "Booking conflict detected with another booking");
    }

    booking.startDate = startDateObj;
    booking.endDate = endDateObj;
  }

  // Update other fields if provided
  if (facility) booking.facility = facility;
  if (status) booking.status = status;
  if (conditionsAccepted !== undefined)
    booking.conditionsAccepted = conditionsAccepted;

  await booking.save();

  const updatedBooking = await Booking.findById(id).populate([
    { path: "facility", select: "name description" },
    { path: "user", select: "name email role" },
  ]);

  // Emit event
  const io = req.app.get("io");
  io.emit("booking_updated", updatedBooking);

  return res
    .status(200)
    .json(new apiResponse(200, updatedBooking, "Booking updated successfully"));
});
const deleteBookingController = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const booking = await Booking.findById(id);
  if (!booking) {
    throw new apiError(404, "Booking not found");
  }
  // 2️⃣ Save it to BookingHistory before deleting
  await BookingHistory.create({
    bookingId: booking._id,
    clientId: booking.clientId,
    facility: booking.facility,
    user: booking.user,
    startDate: booking.startDate,
    endDate: booking.endDate,
    status: "deleted",
    reminderSent: booking.reminderSent || false,
    conditionsAccepted: booking.conditionsAccepted,
    deletedAt: new Date(),
  });


  await booking.deleteOne();
  // Clear the scheduled reminder timeout
  // const reminderTimeouts = req.app.get("bookingReminderTimeouts");
  // const timeoutId = reminderTimeouts.get(id);
  // if (timeoutId) {
  //   clearTimeout(timeoutId);
  //   reminderTimeouts.delete(id);
  //   console.log(`Cancelled reminder email timeout for booking ${id}`);
  // }

  const io = req.app.get("io");
  io.emit("booking_deleted", { id });

  return res
    .status(200)
    .json(new apiResponse(200, {}, "Booking deleted successfully"));
});

const autoCleanUpBookingsController = asyncHandler(async (req, res) => {
  await autoCleanUpBookings(); // Call the shared logic
  return res
    .status(200)
    .json(new apiResponse(200, null, "Cleanup job executed successfully"));
});

// const autoCleanUpBookings = async () => {
//   try {
//     // Get the current time in Karachi timezone
//     const nowKarachi = moment().tz("Asia/Karachi");

//     console.log(
//       `Running cleanup job at (Karachi Time): ${nowKarachi.format("YYYY-MM-DD HH:mm:ss")}`
//         .bgYellow.white
//     );

//     // Fetch all bookings from the database
//     const bookings = await Booking.find({}).lean(); // Use .lean() to return plain JS objects

//     for (const booking of bookings) {
//       const endDate = moment(booking.endDate);

//       if (endDate.isSameOrBefore(nowKarachi)) {
//         console.log(
//           `Booking ID: ${booking._id} is expired. Moving to history and deleting.`
//             .yellow
//         );

//         // Ensure references are correctly copied
//         const bookingHistory = new BookingHistory({
//           clientId: booking.clientId || null, // Ensure it's preserved
//           facility: booking.facility || null,
//           user: booking.user || null,
//           startDate: booking.startDate,
//           endDate: booking.endDate,
//           status: booking.status,
//           conditionsAccepted: booking.conditionsAccepted,
//           deletedAt: nowKarachi.toDate(),
//         });

//         // Save to history
//         await bookingHistory.save();

//         // Delete the booking from the main collection
//         await Booking.deleteOne({ _id: booking._id });

//         console.log(`Booking ID: ${booking._id} has been deleted.`.bgRed.white);
//       }
//     }
//   } catch (error) {
//     console.error("Error during booking cleanup:", error);
//   }
// };

//  const autoCleanUpBookings = async () => {
//   try {
//     const nowKarachi = moment().tz("Asia/Karachi");

//     console.log(
//       `🚀 Running auto-cleanup at (Karachi Time): ${nowKarachi.format("YYYY-MM-DD HH:mm:ss")}`.bgYellow.black
//     );

//     // Fetch all active bookings
//     const bookings = await Booking.find({}).lean();

//     for (const booking of bookings) {
//       const startDate = moment(booking.startDate);
//       const endDate = moment(booking.endDate);
//       const isCompleted = endDate.isSameOrBefore(nowKarachi);

//       // Step 1: Try to find a matching history record (new or legacy)
//       const existingHistory = await BookingHistory.findOne({
//         $or: [
//           { bookingId: booking._id },
//           {
//             bookingId: { $exists: false },
//             clientId: booking.clientId,
//             facility: booking.facility,
//             user: booking.user,
//             startDate: booking.startDate,
//             endDate: booking.endDate,
//           },
//         ],
//       });

//       // Step 2: If no history exists, create one (status = pending)
//       if (!existingHistory) {
//         await BookingHistory.create({
//           bookingId: booking._id,
//           clientId: booking.clientId,
//           facility: booking.facility,
//           user: booking.user,
//           startDate: booking.startDate,
//           endDate: booking.endDate,
//           status: "pending",
//           conditionsAccepted: booking.conditionsAccepted,
//         });

//         console.log(`🟡 Added missing booking to history: ${booking._id}`);
//       }

//       // Step 3: If booking is completed → mark completed + delete from active bookings
//       if (isCompleted) {
//         await BookingHistory.findOneAndUpdate(
//           {
//             $or: [
//               { bookingId: booking._id },
//               {
//                 bookingId: { $exists: false },
//                 clientId: booking.clientId,
//                 facility: booking.facility,
//                 user: booking.user,
//                 startDate: booking.startDate,
//                 endDate: booking.endDate,
//               },
//             ],
//           },
//           {
//             $set: {
//               status: "completed",
//               deletedAt: nowKarachi.toDate(),
//               bookingId: booking._id, // ✅ ensures backfill
//             },
//           }
//         );

//         await Booking.deleteOne({ _id: booking._id });

//         console.log(`✅ Completed & moved to history: ${booking._id}`.bgRed.white);
//       } else {
//         console.log(`📦 Booking still pending: ${booking._id}`.green);
//       }
//     }

//     // Step 4: Backfill bookingId for older histories (optional but smart)
//     const historiesWithoutId = await BookingHistory.find({ bookingId: { $exists: false } });
//     for (const hist of historiesWithoutId) {
//       const match = await Booking.findOne({
//         clientId: hist.clientId,
//         facility: hist.facility,
//         user: hist.user,
//         startDate: hist.startDate,
//         endDate: hist.endDate,
//       });

//       if (match) {
//         await BookingHistory.updateOne(
//           { _id: hist._id },
//           { $set: { bookingId: match._id } }
//         );
//         console.log(`🔄 Backfilled bookingId for history: ${hist._id}`);
//       }
//     }

//     console.log("🎯 Auto cleanup job finished successfully.".bgBlue.white);
//   } catch (error) {
//     console.error("❌ Error during booking cleanup:", error);
//   }
// };

const autoCleanUpBookings = async () => {
  try {
    const nowKarachi = moment().tz("Asia/Karachi");

    console.log(
      `🚀 Running auto-cleanup at (Karachi Time): ${nowKarachi.format("YYYY-MM-DD HH:mm:ss")}`.bgYellow.black
    );

    // Fetch all active (non-deleted) bookings
    const bookings = await Booking.find({})
      .populate("user facility")
      .lean();

    for (const booking of bookings) {
      const startDate = moment(booking.startDate).tz("Asia/Karachi");
      const endDate = moment(booking.endDate).tz("Asia/Karachi");

      const isCompleted = endDate.isSameOrBefore(nowKarachi);
      const isWithin6Hours =
        startDate.isAfter(nowKarachi) &&
        startDate.diff(nowKarachi, "hours") <= 6;

      // Step 1️⃣: Ensure a history record exists
      let existingHistory = await BookingHistory.findOne({
        $or: [
          { bookingId: booking._id },
          {
            bookingId: { $exists: false },
            clientId: booking.clientId,
            facility: booking.facility,
            user: booking.user,
            startDate: booking.startDate,
            endDate: booking.endDate,
          },
        ],
      });

      if (!existingHistory) {
        existingHistory = await BookingHistory.create({
          bookingId: booking._id,
          clientId: booking.clientId,
          facility: booking.facility,
          user: booking.user,
          startDate: booking.startDate,
          endDate: booking.endDate,
          status: "pending",
          reminderSent: false,
          conditionsAccepted: booking.conditionsAccepted,
          deletedAt: null,
        });

        console.log(`🟡 Added missing booking to history: ${booking._id}`);
      }

      // Step 2️⃣: Send reminder email if within 6 hours before start
      if (isWithin6Hours) {
        // 🛑 Skip if reminder already sent
        if (existingHistory?.reminderSent) {
          console.log(`⏩ Reminder already sent for booking: ${booking._id}`);
          continue;
        }

        // 🛑 Double-check booking still exists (not deleted by another cleanup)
        const stillExists = await Booking.exists({ _id: booking._id });
        if (!stillExists) {
          console.log(`🧹 Booking deleted already, skipping reminder: ${booking._id}`);
          continue;
        }

        console.log(`📧 Sending reminder email for booking: ${booking._id}`);

        const formattedStart = startDate.format("YYYY-MM-DD hh:mm A");
        const formattedEnd = endDate.format("YYYY-MM-DD hh:mm A");

        try {
          await sendEmail(
            booking.user.email,
            "Booking Reminder - Starts Soon",
            `
              Hello ${booking.user.name},<br><br>
              This is a friendly reminder that your booking starts in less than 6 hours.<br><br>
              <b>Facility:</b> ${booking.facility.name}<br>
              <b>Start:</b> ${formattedStart}<br>
              <b>End:</b> ${formattedEnd}<br><br>
              Thank you for using our service!
            `,
            true
          );

          // ✅ Mark reminder as sent
          await BookingHistory.updateOne(
            { _id: existingHistory._id },
            { $set: { reminderSent: true } }
          );

          console.log(`✅ Reminder email sent for booking: ${booking._id}`);
        } catch (err) {
          console.error(`❌ Failed to send reminder for ${booking._id}:`, err.message);
        }
      }

      // Step 3️⃣: Mark completed bookings
      if (isCompleted) {
        await BookingHistory.findOneAndUpdate(
          {
            $or: [
              { bookingId: booking._id },
              {
                bookingId: { $exists: false },
                clientId: booking.clientId,
                facility: booking.facility,
                user: booking.user,
                startDate: booking.startDate,
                endDate: booking.endDate,
              },
            ],
          },
          {
            $set: {
              status: "completed",
              deletedAt: nowKarachi.toDate(),
              bookingId: booking._id,
            },
          }
        );

        await Booking.deleteOne({ _id: booking._id });

        console.log(`✅ Completed & moved to history: ${booking._id}`.bgRed.white);
      } else {
        console.log(`📦 Booking still pending: ${booking._id}`.green);
      }
    }

    // Step 4️⃣: Backfill missing bookingIds
    const historiesWithoutId = await BookingHistory.find({ bookingId: { $exists: false } });
    for (const hist of historiesWithoutId) {
      const match = await Booking.findOne({
        clientId: hist.clientId,
        facility: hist.facility,
        user: hist.user,
        startDate: hist.startDate,
        endDate: hist.endDate,
      });

      if (match) {
        await BookingHistory.updateOne(
          { _id: hist._id },
          { $set: { bookingId: match._id } }
        );
        console.log(`🔄 Backfilled bookingId for history: ${hist._id}`);
      }
    }

    console.log("🎯 Auto cleanup job finished successfully.".bgBlue.white);
  } catch (error) {
    console.error("❌ Error during booking cleanup:", error);
  }
};




const getBookingHistoryController = asyncHandler(async (req, res) => {
  // Fetch all booking history``
  const bookingHistory = await BookingHistory.find()
    .populate([
      { path: "facility", select: "name description" },
      { path: "user", select: "name email role" },
    ])
    .sort({ deletedAt: -1 }); // Sort by the most recently deleted

  return res
    .status(200)
    .json(
      new apiResponse(
        200,
        bookingHistory,
        "Booking history fetched successfully"
      )
    );
});
const getBookingHistoryByIdController = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Find the booking history by ID and populate related fields
  const bookingHistory = await BookingHistory.findById(id).populate([
    { path: "facility", select: "name description" },
    { path: "user", select: "name email role" },
  ]);

  if (!bookingHistory) {
    return res
      .status(404)
      .json(new apiResponse(404, null, "Booking history not found"));
  }

  return res
    .status(200)
    .json(
      new apiResponse(
        200,
        bookingHistory,
        "Booking history fetched successfully"
      )
    );
});
const getBookingHistoryByUserIdController = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Find all booking history records for the given user ID
  const bookingHistory = await BookingHistory.find({ user: id })
    .populate([
      { path: "facility", select: "name description" },
      { path: "user", select: "name email role" },
    ])
    .sort({ deletedAt: -1 }); // Sort by most recently deleted

  if (!bookingHistory || bookingHistory.length === 0) {
    return res
      .status(404)
      .json(new apiResponse(404, [], "No booking history found for this user"));
  }

  return res
    .status(200)
    .json(
      new apiResponse(
        200,
        bookingHistory,
        "Booking history fetched successfully"
      )
    );
});
// Get all bookings
const getBookingsController = asyncHandler(async (req, res) => {
  const io = req.app.get("io"); // Access the Socket.IO instance

  // Fetch all bookings including userdata and facilitydata
  const bookings = await Booking.find()
    .populate("user", "_id name email role")
    .populate("facility", "name description");

  // Emit the bookings to all connected clients
  io.emit("bookings_list", bookings);

  // Respond to the client with the booking data
  return res
    .status(200)
    .json(new apiResponse(200, bookings, "Bookings retrieved successfully"));
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
  return res
    .status(200)
    .json(new apiResponse(200, booking, "Booking retrieved successfully"));
});
const getBookingLogsController = asyncHandler(async (req, res) => {
  const { status, user, facility, limit = 50, skip = 0 } = req.query;

  const filter = {};
  if (status) filter.status = status; // e.g., 'error' or 'success'
  if (user) filter.user = user;
  if (facility) filter.facility = facility;

  const logs = await BookingLog.find(filter)
    .sort({ createdAt: -1 })
    .skip(Number(skip))
    .limit(Number(limit))
    .populate("user", "name email")
    .populate("facility", "name");

  return res
    .status(200)
    .json(new apiResponse(200, logs, "Booking logs fetched"));
});

export {
  testEmailTemplateController,
  getBookingLogsController,
  updateBookingController,
  deleteBookingController,
  createBookingController,
  getBookingsController,
  getBookingByIdController,
  autoCleanUpBookingsController,
  autoCleanUpBookings,
  getBookingHistoryController,
  getBookingHistoryByIdController,
  getBookingHistoryByUserIdController,
};
