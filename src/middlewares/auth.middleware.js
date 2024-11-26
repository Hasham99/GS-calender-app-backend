import jwt from "jsonwebtoken";
import { apiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";
import { apiResponse } from "../utils/apiResponse.js";

export const verifyJWT = asyncHandler(async (req, _, next) => {
    try {
        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "")
        if (!token) {
            throw new apiError(401, "UnAuthorized Request")
        }
        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
        // throw new apiResponse(200, decodedToken)
        // const user = await User.findById(decodedToken?._id).select("-password")
        // if (!user) {
        //     throw new apiError(401, "Invalid Access Token")
        // }
        // req.user = user;
        req.user = decodedToken;
        // console.log(`${decodedToken} re.user`);
        next()
    } catch (error) {
        throw new apiError(401, error?.message || "Invalid AccessToken")
    }
})

//is Admin

export const isAdminController = asyncHandler(async (req, res, next) => {
    try {
        // console.log(req.user);
        const user = await User.findById(req.user.id)
        // console.log(user);
        if (user.role !== 1) {
            console.log("UnAuthorized Access");
            return res
                .status(401)
                .json(
                    new apiError(401, "UnAuthorized Access")
                )
        }
        else {
            next();
        }

    } catch (error) {
        throw new apiError(500, error?.message || "Error in Admin Middleware")
    }
})