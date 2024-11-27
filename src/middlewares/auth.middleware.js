import jwt from "jsonwebtoken";
import { asyncHandler } from "../utils/asyncHandler.js";
import { apiError } from "../utils/apiError.js";
import { User } from "../models/user.model.js";

export const verifyJWT = asyncHandler(async (req, _, next) => {
    try {
        const token =
            req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "");
        if (!token) {
            throw new apiError(401, "Unauthorized Request");
        }

        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
        const user = await User.findById(decodedToken.id).select("-password");

        if (!user) {
            throw new apiError(401, "Invalid Access Token");
        }

        req.user = user;
        next();
    } catch (error) {
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
