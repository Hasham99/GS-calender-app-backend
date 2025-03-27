import { Router } from "express";
import { loginController, ForgotPasswordController, getAllUsersController, getAllUsersByRoleController, deleteUserByIdController, verifyOtpController, sendOtpController, registerControllerByAdminClient, updateUserController, verifyEmailOtpController, inviteUserController, acceptInviteController, getAllUsersByIdController, selfRegisterController } from "../controllers/auth.controller.js";
import { verifyJWT, authorizeRoles, isAdminController } from "../middlewares/auth.middleware.js";

const router = Router();

// Public Routes
router.route("/forgot-password").post(ForgotPasswordController);
router.route("/user/verify-email").post(verifyJWT, verifyEmailOtpController);
router.route("/register").post(verifyJWT, registerControllerByAdminClient);
router.route("/self-register/:clientId").post(selfRegisterController);

router.route("/login").post(loginController);

router.route("/send-otp").post(sendOtpController);
router.route("/verify-otp").post(verifyOtpController);

router.route("/invite-user").post(verifyJWT, authorizeRoles("admin"), inviteUserController);
router.route("/invite-accept/:id").post(acceptInviteController);

router.route("/users/:role").get(getAllUsersByRoleController);
router.route("/user/:id").get(getAllUsersByIdController);
router.route("/users").get(getAllUsersController);

router.route("/user/:id").put(verifyJWT, updateUserController);

router.route("/user/:id").delete(verifyJWT, isAdminController, deleteUserByIdController);




export default router;
