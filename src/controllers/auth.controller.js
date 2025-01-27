import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";
import { Facility } from "../models/facility.model.js";
import { apiError } from "../utils/apiError.js";
import { apiResponse } from "../utils/apiResponse.js";
import { comparePassword, hashPassword } from "../utils/hashPassword.js";
import jwt from "jsonwebtoken";
import { sendEmail } from "../utils/emailService.js";
import dotenv from "dotenv";
dotenv.config();


// Function to generate JWT token
const generateToken = (userId) => {
    return jwt.sign({ id: userId }, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
    });
};

export const getAllUsersByRoleController = asyncHandler(async (req, res) => {
    // params userType get from url
    const { role } = req.params;

    // get users having role user
    const users = await User.find({ role }).select("-password");

    res.status(200).json(new apiResponse(200, users, "All users fetched successfully"));
})

export const getAllUsersController = asyncHandler(async (req, res) => {

    // get all users 
    const users = await User.find().select("-password");

    res.status(200).json(new apiResponse(200, users, "All users fetched successfully"));
})

// Controller for adding a new admin (temporary route without authentication)
export const addAdminController = asyncHandler(async (req, res) => {
    const { name, email, password, phoneNumber } = req.body;

    // Check if all required fields are provided
    if (!name || !email || !password || !phoneNumber) {
        throw new apiError(400, "All fields (name, email, password, phoneNumber) are required");
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
        password: hashedPassword,  // Store the hashed password
        role: "admin",  // Admin role
        phoneNumber,
    });

    // Save the new admin to the database
    await adminUser.save();

    // Return the newly created admin (without password)
    const createdAdmin = await User.findById(adminUser._id).select("-password");

    // Send response
    res.status(201).json(new apiResponse(201, createdAdmin, "Admin user added successfully"));
});

// Register User Controller (Only admin can register users)
// export const registerController = asyncHandler(async (req, res) => {
//     // Ensure the user is an admin
//     if (req.user.role !== "admin") {
//         throw new apiError(403, "Only admins can register new users");
//     }

//     const { name, email, password, role } = req.body;

//     // Validate required fields
//     if (!name || !email || !password) {
//         throw new apiError(400, "All fields are required");
//     }

//     // Check if user with the same email already exists
//     const existingUser = await User.findOne({ email });
//     if (existingUser) {
//         throw new apiError(400, "User already exists");
//     }

//     // Hash the password before saving it
//     const hashedPassword = await hashPassword(password);

//     // Save the new user
//     const user = await new User({ name, email, password: hashedPassword, role }).save();
//     const createdUser = await User.findById(user._id).select("-password");

//     res.status(201).json(new apiResponse(201, createdUser, "User registered successfully"));
// });

const generateOtp = () => Math.floor(100000 + Math.random() * 900000);

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

    res.status(201).json(new apiResponse(201, { id: newUser._id }, "User registered successfully. OTP sent to email."));
});

// export const verifyOtpController = asyncHandler(async (req, res) => {
//     const { email, otp } = req.body;

//     if (!email || !otp) {
//         throw new apiError(400, "Email and OTP are required");
//     }

//     const user = await User.findOne({ email });
//     if (!user) {
//         throw new apiError(404, "User not found");
//     }

//     if (user.otp !== otp) {
//         throw new apiError(400, "Invalid OTP");
//     }

//     user.valid = true;
//     user.otp = null; // Clear OTP after verification
//     await user.save();

//     res.status(200).json(new apiResponse(200, null, "User verified successfully."));
// });

//register user with admin no otp required
// export const registerControllerByAdmin = asyncHandler(async (req, res) => {
//     const { name, email, password, role } = req.body;

//     if (!name || !email || !password) {
//         throw new apiError(400, "All fields are required");
//     }

//     const existingUser = await User.findOne({ email });
//     if (existingUser) {
//         throw new apiError(400, "User already exists");
//     }

//     const hashedPassword = await hashPassword(password);

//     const newUser = await User.create({
//         name,
//         email,
//         password: hashedPassword,
//         role,
//         valid: true,
//     });

//     res.status(201).json(new apiResponse(201, { id: newUser._id }, "User registered successfully."));
// });
export const registerControllerByAdmin = asyncHandler(async (req, res) => {
    const { name, email, password, phoneNumber, role, facilityIds, valid } = req.body;

    if (!name || !email || !password) {
        throw new apiError(400, "Name, email, and password are required");
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
        throw new apiError(400, "User already exists");
    }

    const hashedPassword = await hashPassword(password);

    const newUser = await User.create({
        name,
        email,
        password: hashedPassword,
        plainPassword: password,  // Store plain password temporarily
        phoneNumber,
        role,
        valid: valid,
        // valid: valid || false,
        facilities: facilityIds || [],
    });

    let emailContent;
    if (newUser.valid) {
        emailContent = `Hello ${name},\n\nYour account has been created successfully.\nEmail: ${email}\nPassword: ${password}\n\nPlease log in to your account.`;
    } else {
        const inviteLink = `${process.env.APP_BASE_URL}/invite/${newUser._id}`;
        const appDownloadLink = `${process.env.APP_DOWNLOAD_URL}`;
        emailContent = `Hello ${name},\n\nYou have been invited to our platform.\nPlease download our app from the link below:\n${appDownloadLink}\n\nOnce downloaded, use this invite link to verify your account:\n${inviteLink}`;
    }

    const emailSent = await sendEmail(
        email,
        newUser.valid ? "Welcome to Bookable App" : "You're Invited to Bookable App",
        emailContent
    );

    if (!emailSent) {
        throw new apiError(500, "User registered, but failed to send email.");
    }

    res.status(201).json(new apiResponse(201, { id: newUser._id }, "User registered successfully, credentials/invite sent to email."));
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

    res.status(200).json(new apiResponse(200, {}, "OTP sent to email successfully."));
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
        throw new apiError(500, "Account verified, but failed to send confirmation email.");
    }

    res.status(200).json(new apiResponse(200, {}, "Account verified successfully. Confirmation email sent."));
});

// Login User Controller
export const loginController = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    // Validate required fields
    if (!email || !password) {
        throw new apiError(400, "Email and password are required");
    }

    console.log("Login attempt for email:", email);  // Log the email for debugging

    // Find the user by email
    const user = await User.findOne({ email });
    if (!user) {
        console.log("User not found");
        throw new apiError(401, "Invalid email or password");
    }

    console.log("User found:", user._id);  // Log the user object (excluding password)

    // Compare the password entered during login (plain text) with the stored hashed password
    const matchPassword = await comparePassword(password, user.password);
    if (!matchPassword) {
        console.log("Password mismatch:", password, user.password); // Log the mismatch for debugging
        throw new apiError(401, "Invalid email or password");
    }

    console.log("Password match successful".bgGreen.black);  // Log the successful match

    // Generate JWT token for the user
    const token = generateToken(user._id);
    const loggedInUser = await User.findById(user._id).select("-password").populate("facilities", "_id name description");

    res.status(200).json(new apiResponse(200, { user: loggedInUser, token }, "User logged in successfully"));
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

// Protected Test Controller
export const testController = asyncHandler(async (req, res) => {
    res.status(200).json(new apiResponse(200, "Protected Route - Accessible only by authenticated users"));
});


//delete user by id
export const deleteUserByIdController = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const user = await User.findById(id);

    if (!user) {
        throw new apiError(404, "User not found");
    }

    await user.deleteOne();
    return res.status(200).json(new apiResponse(200, user, "User deleted successfully"));
});