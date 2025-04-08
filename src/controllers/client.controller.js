import { asyncHandler } from "../utils/asyncHandler.js";
import { Client } from "../models/client.model.js";
import { apiResponse } from "../utils/apiResponse.js";
import { apiError } from "../utils/apiError.js";
import { hashPassword } from "../utils/hashPassword.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { User } from "../models/user.model.js";


// Controller to create a new client
export const createClientController = asyncHandler(async (req, res) => {
    const { name, email, password, phoneNumber } = req.body;

    // Validate required fields
    if (!name || !email || !password) {
        throw new apiError(400, "All fields (name, email, password) are required phoneNumber is optional");
    }

    // Check if client already exists with the given email
    const existingClient = await Client.findOne({ email });
    if (existingClient) {
        throw new apiError(400, "Client with this email already exists");
    }

    // Hash the password before storing
    const hashedPassword = await hashPassword(password);

    // Create new client
    const newClient = new Client({
        name,
        email,
        password: hashedPassword,
        phoneNumber
    });

    // Save the client to the database
    await newClient.save();

    return res.status(201).json(new apiResponse(201, newClient, "Client created successfully"));
});

// Generate JWT Token function
// const generateToken = (id) => {
//     return jwt.sign({ clientId: id }, process.env.ACCESS_TOKEN_SECRET, {
//         expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
//     });
// };

const generateToken = (id, role = "client", type = "client") => {
    return jwt.sign({ id, role, type }, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
    });
};


// Login Client Controller
export const loginClientController = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    // Validate required fields
    if (!email || !password) {
        throw new apiError(400, 'Email and password are required');
    }

    console.log('Login attempt for email:', email); // Debug log for email

    // Find the client by email
    const client = await Client.findOne({ email });
    if (!client) {
        console.log('Client not found');
        throw new apiError(401, 'Invalid email or password');
    }

    console.log('Client found:', client._id); // Debug log for found client

    // Compare the entered password with the stored hashed password
    const matchPassword = await bcrypt.compare(password, client.password);
    if (!matchPassword) {
        console.log('Password mismatch');
        throw new apiError(401, 'Invalid email or password');
    }

    console.log('Password match successful'); // Debug log for successful match

    // Generate JWT token for the client
    const token = generateToken(client._id);

    // Exclude the password from the response
    const loggedInClient = await Client.findById(client._id).select('-password');

    // Send the response
    res.status(200).json(
        new apiResponse(
            200,
            {
                client: loggedInClient,
                token,
            },
            'Client logged in successfully'
        )
    );
});

// Get Clients Controller
export const getClientsController = asyncHandler(async (req, res) => {
    const { clientId } = req.params;

    if (!clientId) {
        throw new apiError(400, "Client ID is required");
    }

    // Find the client and populate its users field
    const client = await Client.findById(clientId)
        .populate({
            path: "users", // Populate the 'users' field in the Client model
            select: "id name email role createdBy", // Select only the necessary fields
            populate: {
                path: "createdBy", // Populate the 'createdBy' field for each user
                select: "id name email role", // Select specific fields from the creator
            },
        })
        .select("-password"); // Exclude the password field from the client

    if (!client) {
        throw new apiError(404, "Client not found");
    }

    res.status(200).json(
        new apiResponse(200, client, "Client and users retrieved successfully")
    );
});

// Get All Clients Controller
export const getAllClientsController = asyncHandler(async (req, res) => {
    

    // Find the client and populate its users field
    const client = await Client.find()
        .populate({
            path: "users", // Populate the 'users' field in the Client model
            select: "id name email role createdBy", // Select only the necessary fields
            populate: {
                path: "createdBy", // Populate the 'createdBy' field for each user
                select: "id name email role", // Select specific fields from the creator
            },
        })
        .select("-password"); // Exclude the password field from the client

    if (!client) {
        throw new apiError(404, "Client not found");
    }

    res.status(200).json(
        new apiResponse(200, client, "Client and users retrieved successfully")
    );
});
