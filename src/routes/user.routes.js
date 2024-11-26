import { Router } from "express";
import { loginController, registerController, testController, ForgotPasswordController, freeTest } from "../controllers/user.controller.js"
import { isAdminController, verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

//check route will remove production
router.route("/").get(freeTest)

//register route
router.route("/register").post(registerController)

//login route
router.route("/login").post(loginController)

//forgot password
router.route("/forgot-password").post(ForgotPasswordController)

// auth route
router.route("/test").get(verifyJWT, isAdminController, testController)

// protected user route auth
router.route("/user-auth").get(verifyJWT, (req, res) => {
    res.status(200).send({ ok: true })
})
// protected admin route auth
router.route("/admin-auth").get(verifyJWT, isAdminController, (req, res) => {
    res.status(200).send({ ok: true })
})

export default router;