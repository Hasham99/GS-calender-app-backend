import { Router } from "express";
import { createClientController, getClientsController, loginClientController } from "../controllers/client.controller.js";
import { registerControllerByAdminClient } from "../controllers/auth.controller.js";

const router = Router();

// Create a new client
router.route("/register").post(createClientController);
router.route("/login").post(loginClientController);
router.route("/user").post(registerControllerByAdminClient);
router.route("/").get(getClientsController);
router.route("/:clientId").get(getClientsController);

export default router;