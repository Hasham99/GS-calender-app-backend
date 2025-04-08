import jwt from "jsonwebtoken";
import { asyncHandler } from "../utils/asyncHandler.js";
import { apiError } from "../utils/apiError.js";
import { User } from "../models/user.model.js";
import { Client } from "../models/client.model.js";

export const verifyJWT = asyncHandler(async (req, res, next) => {
    try {
        const token =
            req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "");

        if (!token) {
            throw new apiError(401, "Unauthorized Request. No token provided.");
        }

        // Decode and verify the JWT token
        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

        // Attach the decoded token to the request object
        req.decodedToken = decodedToken;  // Attach decoded token for later use

        next();  // Proceed to the next middleware or route handler
    } catch (error) {
        console.error("JWT Verification Error: ", error);  // Log error for debugging
        throw new apiError(401, error?.message || "Invalid Access Token");
    }
});


// Ensure the user has the "admin" role
export const isAdminController = async (req, res, next) => {
    const user = await User.findById(req.user.id);

    if (!user || user.role !== "admin") {
        return next(new apiError(403, "Forbidden. Only admins can access this route"));
    }

    next();  // Allow the request to proceed if the user is an admin
};
export const authorizeRoles = (...allowedRoles) => {
    return asyncHandler(async (req, res, next) => {
        if (!req.user || !allowedRoles.includes(req.user.role)) {
            throw new apiError(403, "Access Denied");
        }
        next();
    });
};

export const verifyClientOrAdmin = asyncHandler(async (req, res, next) => {
    const token =
        req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
        throw new apiError(401, "Unauthorized request. No token provided.");
    }

    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    console.log("Decoded token:", decoded); // Debugging

    // Check for client (super admin)
    if (decoded.type === "client") {
        const client = await Client.findById(decoded.id).select("-password");
        if (!client) throw new apiError(401, "Invalid client token.");
        req.client = client;
        return next();
    }

    // Check for admin user
    if (decoded.type === "user" && decoded.role === "admin") {
        const user = await User.findById(decoded.id).select("-password");
        if (!user) throw new apiError(401, "Invalid user token.");
        req.user = user;
        return next();
    }

    throw new apiError(403, "Access denied. Only clients or admin users allowed.");
});
