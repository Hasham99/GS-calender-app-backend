import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";
import { Facility } from "../models/facility.model.js";
import { apiError } from "../utils/apiError.js";
import { apiResponse } from "../utils/apiResponse.js";
import { comparePassword, hashPassword } from "../utils/hashPassword.js";
import jwt from "jsonwebtoken";
import { sendEmail } from "../utils/emailService.js";
import dotenv from "dotenv";
import { Client } from "../models/client.model.js";
dotenv.config();

// Function to generate JWT token
// const generateToken = (userId) => {
//   return jwt.sign({ id: userId }, process.env.ACCESS_TOKEN_SECRET, {
//     expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
//   });
// };
// Generate JWT Token function
const generateToken = (id, type, role) => {
  return jwt.sign({ id, type, role }, process.env.ACCESS_TOKEN_SECRET, {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
  });
};


export const getAllUsersByRoleController = asyncHandler(async (req, res) => {
  // params userType get from url
  const { role } = req.params;

  // get users having role user
  const users = await User.find({ role }).select("-password");

  res
    .status(200)
    .json(new apiResponse(200, users, "All users fetched successfully"));
});

export const getAllUsersByIdController = asyncHandler(async (req, res) => {
  // params userType get from url
  const { id } = req.params;

  // get users having role user
  const user = await User.findById(id).select("-password").populate("facilities", "_id name description");

  res
    .status(200)
    .json(new apiResponse(200, user, "Users fetched successfully"));
});

export const getAllUsersController = asyncHandler(async (req, res) => {
  // get all users
  const users = await User.find()
    .select("-password -plainPassword -otp")
    .populate("facilities", "_id name description");

  res
    .status(200)
    .json(new apiResponse(200, users, "All users fetched successfully"));
});
export const getUsersByClientIdController = asyncHandler(async (req, res) => {
  // Get clientId from request parameters
  const { clientId } = req.params;

  // Validate clientId
  if (!clientId) {
    throw new apiError(400, "Client ID is required");
  }

  // Find users belonging to the given clientId
  const users = await User.find({ clientId })
    .select("-password -plainPassword -otp") // Exclude sensitive fields
    .populate("facilities", "_id name description"); // Populate facilities

  // If no users are found
  if (users.length === 0) {
    throw new apiError(404, "No users found for this client");
  }

  // Respond with the users data
  res
    .status(200)
    .json(new apiResponse(200, users, "Users fetched successfully for the client"));
});
// Controller for adding a new admin (temporary route without authentication)
export const addAdminController = asyncHandler(async (req, res) => {
  const { name, email, password, phoneNumber } = req.body;

  // Check if all required fields are provided
  if (!name || !email || !password || !phoneNumber) {
    throw new apiError(
      400,
      "All fields (name, email, password, phoneNumber) are required"
    );
  }

  // Check if the role is "admin" (optional validation step)
  // if (role !== "admin") {
  //     throw new apiError(400, "Role must be 'admin'");
  // }

  // Check if the user already exists by email
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new apiError(400, "User with this email already exists");
  }

  // Hash the password for the new admin
  const hashedPassword = await hashPassword(password);

  // Create a new admin user
  const adminUser = new User({
    name,
    email,
    password: hashedPassword, // Store the hashed password
    role: "admin", // Admin role
    phoneNumber,
  });

  // Save the new admin to the database
  await adminUser.save();

  // Return the newly created admin (without password)
  const createdAdmin = await User.findById(adminUser._id).select("-password");

  // Send response
  res
    .status(201)
    .json(new apiResponse(201, createdAdmin, "Admin user added successfully"));
});

export const registerController = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    throw new apiError(400, "All fields are required");
  }

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new apiError(400, "User already exists");
  }

  const hashedPassword = await hashPassword(password);
  const otp = generateOtp();

  const newUser = await User.create({
    name,
    email,
    password: hashedPassword,
    otp,
    valid: false,
  });

  // Send OTP via email
  const emailSent = await sendEmail(
    email,
    "Your OTP for Verification",
    `Your OTP is ${otp}. Please use this to verify your account.`
  );

  if (!emailSent) {
    throw new apiError(500, "Failed to send OTP email. Please try again.");
  }

  res
    .status(201)
    .json(
      new apiResponse(
        201,
        { id: newUser._id },
        "User registered successfully. OTP sent to email."
      )
    );
});

export const registerControllerByAdminClient = asyncHandler(
  async (req, res) => {
    const {
      clientId,
      name,
      email,
      password,
      phoneNumber,
      valid,
      allowedBooking,
      role
    } = req.body;

    const createdBy = req.user?._id; // 🔥 extracted from token

    if (!clientId || !name || !email || !password || !phoneNumber) {
      throw new apiError(
        400,
        "clientId, name, email, password, and phoneNumber are required"
      );
    }

    // Check if the role is valid
    // if (role && !["user", "admin"].includes(role)) {
    //   throw new apiError(
    //     400,
    //     "Invalid role. Role must be either 'user' or 'admin'."
    //   );
    // }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new apiError(400, "User already exists");
    }

    const hashedPassword = await hashPassword(password);

    const newUser = await User.create({
      clientId,
      name,
      email,
      password: hashedPassword,
      plainPassword: password, // Store plain password temporarily
      phoneNumber,
      role: role, // fixed for admin removed (now its dynamic based on request)
      valid: valid || false,
      allowedBooking,
      facilities: [],
      createdBy, // Reference the user who created this user
    });
    // Push the user into the Client's users array
    await Client.findByIdAndUpdate(clientId, {
      $push: { users: newUser._id },
    });
    let emailContent;
    if (newUser.valid) {
      emailContent = `Hello ${name},\n\nYour account has been created successfully.\nEmail: ${email}\nPassword: ${password}\n\nPlease log in to your account.`;
    } else {
      const inviteLink = `${process.env.APP_BASE_URL}#/user/otp_screen?id=${newUser._id}`;
      const appDownloadLink = `${process.env.APP_DOWNLOAD_URL}`;
      // emailContent = `Hello ${name},\n\nYou have been invited to our platform.\nPlease download our app from the link below:\n${appDownloadLink}\n\nOnce downloaded, use this invite link to verify your account:\n${inviteLink}`;
      emailContent = `Hello ${name},\n\nYou have been invited to Bookable.\nUse invite link below to verify your account:\n${inviteLink}`;
    }

    const emailSent = await sendEmail(
      email,
      newUser.valid
        ? "Welcome to Bookable App"
        : "You're Invited to Bookable App",
      emailContent
    );

    if (!emailSent) {
      throw new apiError(500, "User registered, but failed to send email.");
    }

    res
      .status(201)
      .json(
        new apiResponse(
          201,
          { id: newUser._id },
          "User registered successfully."
        )
      );
  }
);

export const inviteUserController = asyncHandler(async (req, res) => {
  const { clientId, email, role, facilities, createdBy } = req.body;

  if (!clientId || !email) {
    throw new apiError(400, "Client ID and Email are required.");
  }

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new apiError(400, "User with this email already exists.");
  }

  // Create a user in pending state (without password)
  const newUser = await User.create({
    clientId,
    email,
    role: role || "user",
    facilities: facilities || [],
    valid: false, // Mark user as invalid until they accept the invite
    createdBy,
  });

  // Generate an invite link
  const inviteLink = `${process.env.APP_BASE_URL}#/user/otp_screen?id=${newUser._id}`;

  // Email content
  const emailContent = `Hello,\n\nYou have been invited to Bookable.\nUse this invite link to verify your account:\n${inviteLink}`;

  // Send invite email
  const emailSent = await sendEmail(
    email,
    "You're Invited to Bookable App",
    emailContent
  );

  if (!emailSent) {
    throw new apiError(500, "User created, but failed to send email.");
  }

  res
    .status(201)
    .json(
      new apiResponse(201, { id: newUser._id }, "Invitation sent successfully.")
    );
});

export const acceptInviteController = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, password, phoneNumber } = req.body;

  if (!name || !password || !phoneNumber) {
    throw new apiError(400, "All fields are required.");
  }

  const user = await User.findById(id);
  if (!user || user.valid) {
    throw new apiError(400, "Invalid or already registered user.");
  }

  // Hash password
  const hashedPassword = await hashPassword(password);

  // Update user details and mark as valid
  user.name = name;
  user.password = hashedPassword;
  // user.plainPassword = password;
  user.phoneNumber = phoneNumber;
  user.valid = true;
  user.acceptedAt = new Date();

  await user.save();

  // Send confirmation email
  const emailContent = `Hello ${name},\n\nYour account has been successfully registered.\n\nYou can now log in using your email and password.`;
  await sendEmail(user.email, "Welcome to Bookable App", emailContent);

  res
    .status(200)
    .json(
      new apiResponse(200, { id: user._id }, "User registered successfully.")
    );
});

export const selfRegisterController = asyncHandler(async (req, res) => {
  const { clientId } = req.params; // Get clientId from URL params
  const { name, email, password, phoneNumber } = req.body;

  if (!clientId || !name || !email || !password || !phoneNumber) {
    throw new apiError(400, "All fields are required.");
  }

  // Check if email already exists under this client
  const existingUserEmail = await User.findOne({ email, clientId });
  if (existingUserEmail) {
    throw new apiError(400, "User with this email already exists for this client.");
  }

  // Check if phone number already exists under this client
  const existingUserPhoneNo = await User.findOne({ phoneNumber, clientId });
  if (existingUserPhoneNo) {
    throw new apiError(400, "User with this phone number already exists for this client.");
  }

  // Hash password
  const hashedPassword = await hashPassword(password);

  // Create user with valid=true (direct registration)
  const newUser = await User.create({
    clientId,
    name,
    email,
    password: hashedPassword,
    phoneNumber,
    // role: role || "user",
    // facilities: ["67e2606adc8d9dad40f4b152","67e2602adc8d9dad40f4b14a"],
    facilities: [],
    valid: true, // User is immediately valid
  });

  // Send confirmation email
  // const emailContent = `Hello ${name},\n\nYour account has been successfully registered on Bookable.\n\nYou can now log in using your email and password.`;
  // await sendEmail(email, "Welcome to Bookable App", emailContent);

  // res.status(201).json(new apiResponse(201, { newUser }, "User registered successfully."));

  // Determine the user type
  const userType = newUser.role === 'client' ? 'client' : 'user';  // Determine type based on role

  // Generate JWT token for the user (client or regular user)
  const token = generateToken(newUser._id, userType, newUser.role);  // Add 'type' and 'role' to the token payload

  // Fetch full user data without password
  const registeredUser = await User.findById(newUser._id)
    .select("-password")
    .populate("facilities", "_id name description");

  // Send confirmation email
  const emailContent = `Hello ${name},\n\nYour account has been successfully registered on Bookable.\n\nYou can now log in using your email and password.`;
  await sendEmail(email, "Welcome to Bookable App", emailContent);

  // Push the user into the Client's users array
  await Client.findByIdAndUpdate(clientId, {
    $push: { users: newUser._id },
  });
  // Send login response
  res
    .status(201)
    .json(
      new apiResponse(
        201,
        { user: registeredUser, token },
        "User registered and logged in successfully."
      )
    );
});

export const sendOtpController = asyncHandler(async (req, res) => {
  const { userId } = req.body;

  const user = await User.findById(userId);
  if (!user) {
    throw new apiError(404, "User not found");
  }

  if (user.valid) {
    throw new apiError(400, "User is already verified");
  }

  const otp = Math.floor(100000 + Math.random() * 900000); // Generate 6-digit OTP
  user.otp = otp;
  await user.save();

  const emailSent = await sendEmail(
    user.email,
    "Your OTP for Account Verification",
    `Hello ${user.name},\n\nYour OTP for verification is: ${otp}\n\nPlease enter this OTP in the app to verify your account.`
  );

  if (!emailSent) {
    throw new apiError(500, "Failed to send OTP email.");
  }

  res
    .status(200)
    .json(new apiResponse(200, {}, "OTP sent to email successfully."));
});

export const verifyOtpController = asyncHandler(async (req, res) => {
  const { userId, otp } = req.body;

  const user = await User.findById(userId);
  if (!user) {
    throw new apiError(404, "User not found");
  }

  if (user.otp !== otp) {
    throw new apiError(400, "Invalid OTP");
  }

  user.valid = true;
  user.otp = null; // Clear OTP after verification
  await user.save();

  // Send congratulations email
  const emailSent = await sendEmail(
    user.email,
    "Congratulations! Your Account is Verified",
    `Hello ${user.name},\n\nCongratulations! Your account has been successfully verified.\n\nHere are your credentials:\nEmail: ${user.email}\nPassword: ${user.plainPassword}\n\nYou can now log in and start using our platform.\n\nBest regards,\nThe Team`
  );

  if (!emailSent) {
    throw new apiError(
      500,
      "Account verified, but failed to send confirmation email."
    );
  }
  // Generate JWT token
  const token = generateToken(user._id);

  // Fetch full user data without password
  const registeredUser = await User.findById(user._id)
    .select("-password")
    .populate("facilities", "_id name description");

  res
    .status(200)
    .json(
      new apiResponse(
        200,
        { user: registeredUser, token },
        "Account verified successfully. Confirmation email sent."
      )
    );
});

export const updateUserController = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {
    name,
    phoneNumber,
    email,
    password,
    addFacilityIds,
    removeFacilityIds,
  } = req.body;

  if (!id) {
    throw new apiError(400, "User ID is required.");
  }

  const user = await User.findById(id);
  if (!user) {
    throw new apiError(404, "User not found.");
  }

  let updateFields = {};

  // Update Name
  if (name && name !== user.name) {
    updateFields.name = name;
    await sendEmail(
      user.email,
      "Profile Update Notification",
      `Hello ${user.name},\n\nYour name has been successfully updated to "${name}".\n\nIf you didn't request this change, please contact support.\n\nBest,\nThe Team`
    );
  }

  // Update Phone Number
  if (phoneNumber && phoneNumber !== user.phoneNumber) {
    updateFields.phoneNumber = phoneNumber;
    await sendEmail(
      user.email,
      "Profile Update Notification",
      `Hello ${user.name},\n\nYour phone number has been successfully updated to "${phoneNumber}".\n\nIf you didn't request this change, please contact support.\n\nBest,\nThe Team`
    );
  }

  // Update Password (Hash it before saving)
  if (password) {
    updateFields.password = await hashPassword(password);
    updateFields.plainPassword = password;
    await sendEmail(
      user.email,
      "Security Alert: Password Changed",
      `Hello ${user.name},\n\nYour account password has been successfully changed.\n\nIf you didn't request this change, please contact support immediately.\n\nBest,\nThe Team`
    );
  }

  // If user wants to update email, send OTP to the OLD email
  if (email && email !== user.email) {
    const existingUser = await User.findOne({ email });
    if (existingUser && existingUser._id.toString() !== id) {
      throw new apiError(400, "Email already in use.");
    }

    const otp = Math.floor(100000 + Math.random() * 900000); // Generate 6-digit OTP
    user.otp = otp;
    await user.save();

    await sendEmail(
      user.email, // Send OTP to the OLD email
      "Email Change Verification",
      `Hello ${user.name},\n\nYou requested to change your email.\nYour OTP for verification is: ${otp}.\n\nPlease enter this OTP to confirm your email change.\n\nBest,\nThe Team`
    );

    return res
      .status(200)
      .json(
        new apiResponse(
          200,
          {},
          "OTP sent to your current email for verification."
        )
      );
  }
  // Handle Adding and Removing Facilities
  if (addFacilityIds && addFacilityIds.length > 0) {
    updateFields.facilities = [
      ...new Set([
        ...user.facilities.map((facility) => facility.toString()),
        ...addFacilityIds,
      ]),
    ]; // Prevent duplicates
  }

  if (removeFacilityIds && removeFacilityIds.length > 0) {
    updateFields.facilities = user.facilities.filter(
      (facility) => !removeFacilityIds.includes(facility.toString())
    );
  }
  // Apply updates (except email, which needs OTP verification)
  const updatedUser = await User.findByIdAndUpdate(id, updateFields, {
    new: true,
  });

  res
    .status(200)
    .json(new apiResponse(200, updatedUser, "User updated successfully."));
});

export const verifyEmailOtpController = asyncHandler(async (req, res) => {
  const { userId, otp, newEmail } = req.body;

  const user = await User.findById(userId);
  if (!user) {
    throw new apiError(404, "User not found.");
  }

  if (user.otp !== otp) {
    throw new apiError(400, "Invalid OTP.");
  }

  // Check if the email is already taken
  const existingUser = await User.findOne({ email: newEmail });
  if (existingUser && existingUser._id.toString() !== userId) {
    throw new apiError(400, "Email already in use.");
  }

  // Update the email since OTP is verified
  user.email = newEmail;
  user.otp = null; // Clear OTP after successful verification
  await user.save();

  await sendEmail(
    user.email,
    "Email Change Confirmation",
    `Hello ${user.name},\n\nYour email has been successfully updated to "${user.email}".\n\nIf you didn't request this change, please contact support.\n\nBest,\nThe Team`
  );

  res.status(200).json(new apiResponse(200, {}, "Email updated successfully."));
});

// Login User Controller
export const loginController = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Validate required fields
  if (!email || !password) {
    throw new apiError(400, "Email and password are required");
  }

  // Find the user by email
  const user = await User.findOne({ email });
  if (!user) {
    throw new apiError(401, "Invalid email or password");
  }

  // Compare the password entered during login (plain text) with the stored hashed password
  const matchPassword = await comparePassword(password, user.password);
  if (!matchPassword) {
    throw new apiError(401, "Invalid email or password");
  }

  // Determine the user type
  const userType = user.role === 'client' ? 'client' : 'user';  // Determine type based on role

  // Generate JWT token for the user (client or regular user)
  const token = generateToken(user._id, userType, user.role);  // Add 'type' and 'role' to the token payload
  
  const loggedInUser = await User.findById(user._id)
    .select("-password")
    .populate("facilities", "_id name description");

  res
    .status(200)
    .json(
      new apiResponse(
        200,
        { user: loggedInUser, token },
        "User logged in successfully"
      )
    );
});

// Forgot Password Controller
export const ForgotPasswordController = asyncHandler(async (req, res) => {
  const { email, secret, newPassword } = req.body;

  if (!email) {
    throw new apiError(400, "Email is required");
  }
  if (!secret) {
    throw new apiError(400, "Secret is required");
  }
  if (!newPassword) {
    throw new apiError(400, "New password is required");
  }

  // Find the user by email and secret
  const user = await User.findOne({ email, secret });
  if (!user) {
    throw new apiError(404, "User not found or invalid secret");
  }

  // Hash the new password and update it
  const hashedPassword = await hashPassword(newPassword);
  await User.findByIdAndUpdate(user._id, { password: hashedPassword });

  res.status(200).json(new apiResponse(200, "Password reset successfully"));
});

//delete user by id
export const deleteUserByIdController = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const user = await User.findById(id);

  if (!user) {
    throw new apiError(404, "User not found");
  }

  await user.deleteOne();
  return res
    .status(200)
    .json(new apiResponse(200, user, "User deleted successfully"));
});
// export const deleteUserByIdController = asyncHandler(async (req, res) => {
//   const { id, clientId } = req.params; // Get both user and clientId from URL params

//   // Check if the request is made by the client or admin user
//   if (req.client) {
//     // If the request is made by a client, ensure the clientId matches the client in the token
//     if (req.client.id.toString() !== clientId.toString()) {
//       throw new apiError(403, "Access denied. You do not have permission to delete this user.");
//     }
//   }

//   // If the request is made by an admin user, proceed with deletion
//   if (req.user) {
//     // Ensure that only an admin can delete the user
//     if (req.user.role !== "admin") {
//       throw new apiError(403, "Access denied. Only admins can perform this action.");
//     }
//   }

//   const user = await User.findById(id);

//   if (!user) {
//     throw new apiError(404, "User not found");
//   }

//   await user.deleteOne();
//   return res
//     .status(200)
//     .json(new apiResponse(200, user, "User deleted successfully"));
// });
