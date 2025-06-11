import { Router } from "express";
import { loginController, ForgotPasswordController, getAllUsersByRoleController, deleteUserByIdController, verifyOtpController, sendOtpController, registerControllerByAdminClient, updateUserController, verifyEmailOtpController, inviteUserController, acceptInviteController, getAllUsersByIdController, selfRegisterController, getUsersByClientIdController } from "../controllers/auth.controller.js";
import { verifyJWT, authorizeRoles, isAdminController, verifyClientOrAdmin } from "../middlewares/auth.middleware.js";
import { testEmailTemplateController } from "../controllers/booking.controller.js";

const router = Router();

// Public Routes
// router.route("/forgot-password").post(ForgotPasswordController);
// router.route("/user/verify-email").post(verifyJWT, verifyEmailOtpController);
router.route("/register").post(verifyJWT ,verifyClientOrAdmin, registerControllerByAdminClient);
router.route("/self-register/:clientId").post(selfRegisterController);

router.route("/login").post(loginController);
router.route("/email-sent").get(testEmailTemplateController);

router.route("/send-otp").post(sendOtpController);
router.route("/verify-otp").post(verifyOtpController);

// router.route("/invite-user").post(verifyJWT, authorizeRoles("admin"), inviteUserController);
// router.route("/invite-accept/:id").post(acceptInviteController);

// router.route("/users/:role").get(getAllUsersByRoleController);
router.route("/user/:id").get(getAllUsersByIdController);
// router.route("/users").get(getAllUsersController);
router.route("/users/:clientId").get(getUsersByClientIdController);

router.route("/user/:id").put(verifyJWT, updateUserController);

router.route("/user/:clientId/:id").delete( verifyJWT ,verifyClientOrAdmin, deleteUserByIdController);

export default router;
