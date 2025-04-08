import { asyncHandler } from "../utils/asyncHandler.js";
import { apiResponse } from "../utils/apiResponse.js";
import { Facility } from "../models/facility.model.js";
import { apiError } from "../utils/apiError.js";


// Get all facilities by Id
const getFacilitiesByIdController = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const facilities = await Facility.find({ _id: id });
    const facility = await Facility.findById(id);
    if (!facility) {
        throw new apiError(404, "Facility not found");
    }
    return res.status(200).json(new apiResponse(200, facilities, "Facilities fetched successfully"));
});
const getFacilitiesByClientIdController = asyncHandler(async (req, res) => {
    const { clientId } = req.params;

    if (!clientId) {
        throw new apiError(400, "Client ID is required in params");
    }

    const facilities = await Facility.find({ clientId });

    return res
        .status(200)
        .json(new apiResponse(200, facilities, "Facilities fetched successfully"));
});

// Delete a facility
const deleteFacilityController = asyncHandler(async (req, res) => {
    const { id } = req.params;
    // first find by id then show the facility deleted with response of facility id deleted then delete the facility
    const facility = await Facility.findById(id);
    if (!facility) {
        return res.status(404).json(new apiError(404, "Facility not found"));
    }
    await facility.deleteOne();
    return res.status(200).json(new apiResponse(200, facility, "Facility deleted successfully"));

    // delete facility
    // await facility.delete();
    // return res.status(200).json(new apiResponse(200, facility, "Facility deleted successfully"));
});

// Create a new facility
const createFacilityController = asyncHandler(async (req, res) => {
    const { clientId, name, description,availability } = req.body;

    // Validate required fields
    if (!clientId || !name) {
        return res.status(400).json(new apiError(400, "clientId and Facility name is required"));
    }

    // Create a new facility
    const newFacility = new Facility({
        clientId,
        name,
        description,
        availability, // By default, the facility is available
    });

    // Save the facility to the database
    await newFacility.save();

    return res.status(201).json(new apiResponse(201, newFacility, "Facility created successfully"));
});

export {getFacilitiesByClientIdController, createFacilityController, deleteFacilityController, getFacilitiesByIdController };
