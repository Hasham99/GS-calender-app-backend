import { asyncHandler } from "../utils/asyncHandler.js";
import { apiResponse } from "../utils/apiResponse.js";
import { Facility } from "../models/facility.model.js";
import { apiError } from "../utils/apiError.js";

// Get all facilities
const getFacilitiesController = asyncHandler(async (req, res) => {
    const facilities = await Facility.find();
    return res.status(200).json(new apiResponse(200, facilities, "Facilities fetched successfully"));
});

// Create a new facility
const createFacilityController = asyncHandler(async (req, res) => {
    const { name, description } = req.body;

    // Validate required fields
    if (!name) {
        return res.status(400).json(new apiError(400, "Facility name is required"));
    }

    // Create a new facility
    const newFacility = new Facility({
        name,
        description,
        availability: true, // By default, the facility is available
    });

    // Save the facility to the database
    await newFacility.save();

    return res.status(201).json(new apiResponse(201, newFacility, "Facility created successfully"));
});

export { getFacilitiesController, createFacilityController };
