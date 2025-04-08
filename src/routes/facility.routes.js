import { Router } from "express";
import {
     createFacilityController, deleteFacilityController, getFacilitiesByIdController,
    getFacilitiesByClientIdController
} from "../controllers/facility.controller.js";
import { verifyJWT, authorizeRoles, verifyClientOrAdmin } from "../middlewares/auth.middleware.js";

const router = Router();

// Get all facilities by Client Id
router.route("/:clientId").get(verifyJWT, getFacilitiesByClientIdController);
router.route("/:id").delete(verifyJWT, verifyClientOrAdmin, deleteFacilityController);
router.route("/").post(verifyJWT, verifyClientOrAdmin, createFacilityController);


export default router;
