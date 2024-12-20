import { Router } from "express";
import { registerController, loginController, testController, ForgotPasswordController, addAdminController } from "../controllers/auth.controller.js";
import { verifyJWT, authorizeRoles, isAdminController } from "../middlewares/auth.middleware.js";

const router = Router();

// Add a new admin (Admin-only route)
router.route("/add-admin").post(addAdminController);  // Only accessible to authenticated admins

// Public Routes
router.route("/login").post(loginController);
router.route("/forgot-password").post(ForgotPasswordController);

// Admin-only Route for Registration
router.route("/register").post(verifyJWT, authorizeRoles("admin"), registerController);

// Protected Route for Testing (accessible by authenticated users)
router.route("/test").get(testController);

export default router;
