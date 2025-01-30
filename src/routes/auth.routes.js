import { Router } from "express";
import { loginController, testController, ForgotPasswordController, addAdminController, getAllUsersController, getAllUsersByRoleController, deleteUserByIdController, verifyOtpController, sendOtpController, registerControllerByAdminCient } from "../controllers/auth.controller.js";
import { verifyJWT, authorizeRoles, isAdminController } from "../middlewares/auth.middleware.js";

const router = Router();

// Add a new admin (Admin-only route) temporary
router.route("/add-admin").post(addAdminController);  // Only accessible to authenticated admins

// Public Routes
router.route("/login").post(loginController);
router.route("/forgot-password").post(ForgotPasswordController);
router.route("/users/:role").get(getAllUsersByRoleController);
router.route("/users").get(getAllUsersController);

router.route("/user/:id").delete(verifyJWT, isAdminController, deleteUserByIdController);

router.route("/register").post(verifyJWT, registerControllerByAdminCient);
router.post("/send-otp", sendOtpController);
router.post("/verify-otp", verifyOtpController);
router.route("/test").get(testController);

export default router;
