import { Limitation } from "../models/limitation.model.js";
import { apiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { apiResponse } from "../utils/apiResponse.js";

// Controller to create or update a limitation
const createOrUpdateLimitationController = asyncHandler(async (req, res) => {
    const { clientId, user, facility, maxBookingsPerWeek, maxBookingsPerMonth, maxWeeksAdvance } = req.body;

    // Validate required fields
    if (!clientId || !user || !facility) {
        throw new apiError(400, "Client ID, User ID, and Facility ID are required.");
    }

    // Check if a limitation already exists for this user and facility
    let limitation = await Limitation.findOne({ clientId, user, facility });

    if (limitation) {
        // Update the existing limitation
        limitation.maxBookingsPerWeek = maxBookingsPerWeek || limitation.maxBookingsPerWeek;
        limitation.maxBookingsPerMonth = maxBookingsPerMonth || limitation.maxBookingsPerMonth;
        limitation.maxWeeksAdvance = maxWeeksAdvance || limitation.maxWeeksAdvance;
        await limitation.save();
        return res.status(200).json(new apiResponse(200, limitation, "Limitation updated successfully"));
    } else {
        // Create a new limitation if none exists
        limitation = new Limitation({
            clientId,
            user,
            facility,
            maxBookingsPerWeek: maxBookingsPerWeek || 3, // Default to 3 if not provided
            maxBookingsPerMonth: maxBookingsPerMonth || 10, // Default to 10 if not provided
            maxWeeksAdvance: maxWeeksAdvance || 4, // Default to 4 weeks if not provided
        });

        await limitation.save();
        return res.status(201).json(new apiResponse(201, limitation, "Limitation created successfully"));
    }
});

// Controller to get limitation by user and facility
const getAllLimitationController = asyncHandler(async (req, res) => {
    // const { clientId, user, facility } = req.params;

    // Fetch the limitation for the user and facility
    const limitation = await Limitation.find();
    // const limitation = await Limitation.findOne({ clientId, user, facility });

    if (!limitation) {
        throw new apiError(404, "Limitation not found for the specified user and facility");
    }

    return res.status(200).json(new apiResponse(200, limitation, "Limitation fetched successfully"));
});
// Controller to get limitation by user and facility
// const getLimitationController = asyncHandler(async (req, res) => {
//     const { clientId, userId, facilityId } = req.body;

//     // Validate required fields
//     if (!clientId || !userId ) {
//         throw new apiError(400, "Client ID, User ID required.");
//     }
//     // Fetch the limitation for the user and facility
//     const limitation = await Limitation.findOne({ clientId, user: userId, facility: facilityId });

//     if (!limitation) {
//         throw new apiError(404, "Limitation not found for the specified user and facility");
//     }

//     return res.status(200).json(new apiResponse(200, limitation, "Limitation fetched successfully"));
// });
const getLimitationController = asyncHandler(async (req, res) => {
    const { clientId, userId, facilityId } = req.body;

    // If facilityId is provided, search by clientId, userId, and facilityId
    // Otherwise, search by clientId and userId only
    let query = { clientId, user: userId };

    if (facilityId) {
        query.facility = facilityId; // Add facility to the query only if it's provided
    }

    // Fetch the limitation based on the query
    const limitation = await Limitation.findOne(query);

    if (!limitation) {
        throw new apiError(404, "Limitation not found for the specified user and facility");
    }

    return res.status(200).json(new apiResponse(200, limitation, "Limitation fetched successfully"));
});

export const getLimitationForUserFacility = async (clientId, userId, facilityId) => {
    const limitation = await Limitation.findOne({ clientId, user: userId, facility: facilityId });

    return {
        maxWeeksAdvance: limitation?.maxWeeksAdvance ?? 4, // default 4 weeks
        maxBookingsPerWeek: limitation?.maxBookingsPerWeek ?? 3, // default 3 per week
        maxBookingsPerMonth: limitation?.maxBookingsPerMonth ?? 10, // optional
    };
};

export {getAllLimitationController, createOrUpdateLimitationController, getLimitationController };
    