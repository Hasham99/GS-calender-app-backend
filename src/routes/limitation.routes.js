import { Router } from "express";
import { verifyJWT, authorizeRoles, verifyClientOrAdmin } from "../middlewares/auth.middleware.js";
import { getLimitationController,getAllLimitationController, createOrUpdateLimitationController } from "../controllers/limitation.controller.js";

const router = Router();

// Get all facilities by Client Id
router.route("/:clientId/:userId/:facilityId").get(getLimitationController);
// router.route("/").get(getAllLimitationController);
router.route("/").post(verifyJWT,verifyClientOrAdmin,createOrUpdateLimitationController);

// router.route("/:id").delete(verifyJWT, verifyClientOrAdmin, deleteFacilityController);
// router.route("/").post(verifyJWT, verifyClientOrAdmin, createFacilityController);


export default router;
