import { Router } from "express";
import { loginController, ForgotPasswordController, getAllUsersController, getAllUsersByRoleController, deleteUserByIdController, verifyOtpController, sendOtpController, registerControllerByAdminClient, updateUserController, verifyEmailOtpController, inviteUserController, acceptInviteController } from "../controllers/auth.controller.js";
import { verifyJWT, authorizeRoles, isAdminController } from "../middlewares/auth.middleware.js";

const router = Router();

// Public Routes
router.route("/login").post(loginController);
router.route("/forgot-password").post(ForgotPasswordController);
router.route("/users/:role").get(getAllUsersByRoleController);
router.route("/users").get(getAllUsersController);

router.route("/user/:id").delete(verifyJWT, isAdminController, deleteUserByIdController);
router.route("/user/:id").put(verifyJWT, updateUserController);
router.route("/user/verify-email").post(verifyJWT, verifyEmailOtpController);



router.route("/register").post(verifyJWT, registerControllerByAdminClient);
router.post("/send-otp", sendOtpController);
router.post("/verify-otp", verifyOtpController);

router.post("/invite-user", verifyJWT, authorizeRoles("admin"), inviteUserController);
router.post("/invite-accept/:id", acceptInviteController);

export default router;
