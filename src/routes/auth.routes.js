import { Router } from "express";
import { loginController, testController, ForgotPasswordController, addAdminController, getAllUsersController, getAllUsersByRoleController, deleteUserByIdController, verifyOtpController, registerControllerByAdmin } from "../controllers/auth.controller.js";
import { verifyJWT, authorizeRoles, isAdminController } from "../middlewares/auth.middleware.js";

const router = Router();

// Add a new admin (Admin-only route)
router.route("/add-admin").post(addAdminController);  // Only accessible to authenticated admins

// Public Routes
router.route("/login").post(loginController);
router.route("/forgot-password").post(ForgotPasswordController);
router.route("/users/:role").get(getAllUsersByRoleController);
router.route("/users").get(getAllUsersController);

//delete user route
router.route("/user/:id").delete(isAdminController, deleteUserByIdController);

// Admin-only Route for Registration
router.route("/register").post(verifyJWT, authorizeRoles("admin"), registerControllerByAdmin);
// router.route("/register-user").post(registerController);

// Verify OTP Route
router.post("/verify-otp", verifyOtpController);

// Protected Route for Testing (accessible by authenticated users)
router.route("/test").get(testController);

export default router;
