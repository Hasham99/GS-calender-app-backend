import { Router } from "express";
import {
    getFacilitiesController, createFacilityController, deleteFacilityController, getFacilitiesByIdController
} from "../controllers/facility.controller.js";
import { verifyJWT, authorizeRoles } from "../middlewares/auth.middleware.js";

const router = Router();

// Get all facilities
router.route("/").get(getFacilitiesController);
router.route("/:id").get(verifyJWT, getFacilitiesByIdController);
router.route("/:id").delete(verifyJWT, deleteFacilityController);
router.route("/").post(verifyJWT, authorizeRoles("admin"), createFacilityController);


export default router;
