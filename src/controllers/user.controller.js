import { asyncHandler } from "../utils/asyncHandler.js"
import { User } from "../models/user.model.js"
import { apiError } from "../utils/apiError.js"
import { apiResponse } from "../utils/apiResponse.js"
import { comparePassword, hashPassword } from "../utils/hashPassword.js"
import jwt from "jsonwebtoken"


//Register controller
const freeTest = asyncHandler(async (req, res) => {
    try {
        res.status(200).json({ message: "Free Test" })
    } catch (error) {
        throw new apiError(500, error?.message || "FreeTest Failed from Server")
    }
})

//Register controller
const registerController = asyncHandler(async (req, res) => {
    try {
        const { username, fullName, email, password, phoneNo, secret, address } = req.body;
        if (!username) {
            throw new apiError(400, "Username is required")
        }
        if (!fullName) {
            throw new apiError(400, "Full Name is required")
        }
        if (!email) {
            throw new apiError(400, "Email is required")
        }
        if (!password) {
            throw new apiError(400, "password is required")
        }
        if (!phoneNo) {
            throw new apiError(400, "Phone No is required")
        }
        if (!secret) {
            throw new apiError(400, "Secret is required")
        }
        if (!address) {
            throw new apiError(400, "Address is required")
        }

        // check user
        const existingUser = await User.findOne({ email })

        //existing User
        if (existingUser) {
            throw new apiError(400, "User already exist please Login")
        }

        // hashing password
        const hashedPassword = await hashPassword(password)

        // saving user
        // const user = await User.create({ username, fullName, email, password: hashedPassword, phoneNo, address });

        const user = await new User({ username, fullName, email, password: hashedPassword, secret, phoneNo, address }).save();

        // chech if user created and removing pass from response
        const createdUser = await User.findById(user._id).select(
            "-password -role"
        )

        return res.status(201).json(
            new apiResponse(200, createdUser, "User Registered Successfully")
        )
    } catch (error) {
        throw new apiError(500, error?.message || "Register Failed from Server")
    }
})

//login controller
const loginController = asyncHandler(async (req, res) => {
    try {
        const { email, password } = req.body;
        // validate
        if (!email || !password) {
            throw new apiError(401, "Invalid email or password")
        }
        // checking user from db
        const user = await User.findOne({ email })
        if (!user) {
            throw new apiError(401, "User does not exist please register")
        }

        const matchPassword = await comparePassword(password, user.password)
        if (!matchPassword) {
            throw new apiError(200, "Invalid Password")
        }

        // creating token
        const token = jwt.sign({ id: user._id }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: process.env.ACCESS_TOKEN_EXPIRY })

        const loggedInUser = await User.findById(user._id).select("-password");
        return res
            .status(200)
            .json(
                new apiResponse(201,
                    {
                        user: loggedInUser, token
                    },
                    "User Login Successfully"))
    } catch (error) {
        throw new apiError(500, error?.message || "Login Failed from Server")
    }
})

//forgot pass controller
const ForgotPasswordController = asyncHandler(async (req, res) => {
    try {
        const { email, secret, newPassword } = req.body;

        if (!email) {
            throw new apiError(400, "Email No is required")
        }
        if (!secret) {
            throw new apiError(400, "Secret is required")
        }
        if (!newPassword) {
            throw new apiError(400, "new password is required")
        }

        const user = await User.findOne({ email, secret })

        if (!user) {
            return res
                .status(404)
                .json(
                    new apiResponse(404, "something went wrong")
                )
        }
        const newHashedPassword = await hashPassword(newPassword);
        await User.findByIdAndUpdate(user._id, { password: newHashedPassword })

        return res
            .status(200)
            .json(new apiResponse(200, "password reset successfully"))

    } catch (error) {
        throw new apiError(500, error?.message || "forgot password failed")
    }
})

//test jwt verify controller
const testController = asyncHandler(async (req, res) => {
    res
        .status(200)
        .json(
            new apiResponse(200, "Protected Route")
        )
})



export { registerController, loginController, testController, ForgotPasswordController, freeTest }