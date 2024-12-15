import { Router } from "express";
import {
    getFacilitiesController, createFacilityController
} from "../controllers/facility.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

// Get all facilities
router.route("/").get(verifyJWT, getFacilitiesController);
router.route("/").post(verifyJWT, createFacilityController);

// Get availability of a specific facility
// router.route("/:facilityId/availability").get(verifyJWT, getFacilityAvailabilityController);

export default router;
