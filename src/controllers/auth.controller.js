import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";
import { apiError } from "../utils/apiError.js";
import { apiResponse } from "../utils/apiResponse.js";
import { comparePassword, hashPassword } from "../utils/hashPassword.js";
import jwt from "jsonwebtoken";

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
    const { name, email, password, role } = req.body;

    // Check if all required fields are provided
    if (!name || !email || !password || !role) {
        throw new apiError(400, "All fields (name, email, password, role) are required");
    }

    // Check if the role is "admin" (optional validation step)
    if (role !== "admin") {
        throw new apiError(400, "Role must be 'admin'");
    }

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
    });

    // Save the new admin to the database
    await adminUser.save();

    // Return the newly created admin (without password)
    const createdAdmin = await User.findById(adminUser._id).select("-password");

    // Send response
    res.status(201).json(new apiResponse(201, createdAdmin, "Admin user added successfully"));
});
// Register User Controller (Only admin can register users)
export const registerController = asyncHandler(async (req, res) => {
    // Ensure the user is an admin
    if (req.user.role !== "admin") {
        throw new apiError(403, "Only admins can register new users");
    }

    const { name, email, password, role } = req.body;

    // Validate required fields
    if (!name || !email || !password) {
        throw new apiError(400, "All fields are required");
    }

    // // Ensure the role is either "admin" or "user"
    // if (role !== "admin" && role !== "user") {
    //     throw new apiError(400, "Invalid role. Only 'admin' or 'user' are allowed");
    // }

    // Check if user with the same email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
        throw new apiError(400, "User already exists");
    }

    // Hash the password before saving it
    const hashedPassword = await hashPassword(password);

    // Save the new user
    const user = await new User({ name, email, password: hashedPassword, role }).save();
    const createdUser = await User.findById(user._id).select("-password");

    res.status(201).json(new apiResponse(201, createdUser, "User registered successfully"));
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

    console.log("User found:", user);  // Log the user object (excluding password)

    // Compare the password entered during login (plain text) with the stored hashed password
    const matchPassword = await comparePassword(password, user.password);
    if (!matchPassword) {
        console.log("Password mismatch:", password, user.password); // Log the mismatch for debugging
        throw new apiError(401, "Invalid email or password");
    }

    console.log("Password match successful");

    // Generate JWT token for the user
    const token = generateToken(user._id);
    const loggedInUser = await User.findById(user._id).select("-password");

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
