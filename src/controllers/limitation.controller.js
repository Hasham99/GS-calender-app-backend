import { Limitation } from "../models/limitation.model.js";
import { apiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { apiResponse } from "../utils/apiResponse.js";

// Controller to create or update a limitation
const createOrUpdateLimitationController = asyncHandler(async (req, res) => {
    const { clientId, user, rules } = req.body;
  
    if (!clientId || !user || !Array.isArray(rules) || rules.length === 0) {
      throw new apiError(400, "Client ID, User ID, and at least one rule are required.");
    }
  
    // Find if a limitation document already exists
    let limitationDoc = await Limitation.findOne({ clientId, user });
  
    if (!limitationDoc) {
      // If not exists, create new with rules
      limitationDoc = new Limitation({ clientId, user, rules });
      await limitationDoc.save();
      return res.status(201).json(new apiResponse(201, limitationDoc, "Limitation rules created successfully"));
    }
  
    // If exists, update or insert individual rules
    for (const rule of rules) {
      const { facility, maxBookingsPerWeek, maxBookingsPerMonth, maxWeeksAdvance, overriddenBy } = rule;
  
      // Find index of existing rule for the same facility
      const existingRuleIndex = limitationDoc.rules.findIndex(r =>
        r.facility.toString() === facility.toString()
      );
  
      if (existingRuleIndex !== -1) {
        // Update existing rule
        limitationDoc.rules[existingRuleIndex] = {
          ...limitationDoc.rules[existingRuleIndex]._doc,
          maxBookingsPerWeek: maxBookingsPerWeek ?? limitationDoc.rules[existingRuleIndex].maxBookingsPerWeek,
          maxBookingsPerMonth: maxBookingsPerMonth ?? limitationDoc.rules[existingRuleIndex].maxBookingsPerMonth,
          maxWeeksAdvance: maxWeeksAdvance ?? limitationDoc.rules[existingRuleIndex].maxWeeksAdvance,
          overriddenBy: overriddenBy ?? limitationDoc.rules[existingRuleIndex].overriddenBy,
        };
      } else {
        // Push new rule
        limitationDoc.rules.push({
          facility,
          maxBookingsPerWeek,
          maxBookingsPerMonth,
          maxWeeksAdvance,
          overriddenBy
        });
      }
    }
  
    await limitationDoc.save();
    return res.status(200).json(new apiResponse(200, limitationDoc, "Limitation rules updated successfully"));
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
// const getLimitationController = asyncHandler(async (req, res) => {
//     const { clientId, userId, facilityId } = req.body;
//     if (!clientId || !userId) {
//         throw new apiError(400, "Client ID and User ID are required.");
//     }
//     // If facilityId is provided, search by clientId, userId, and facilityId
//     // Otherwise, search by clientId and userId only
//     let query = { clientId, user: userId };

//     if (facilityId) {
//         query.facility = facilityId; // Add facility to the query only if it's provided
//     }

//     // Fetch the limitation based on the query
//     const limitations = await Limitation.find(query);

//     if (!limitations || limitations.length === 0) {
//         throw new apiError(404, "No limitation(s) found for the specified criteria");
//     }

//     return res.status(200).json(new apiResponse(200, limitations, "Limitation fetched successfully"));
// });

const getLimitationController = asyncHandler(async (req, res) => {
    // const { clientId, userId, facilityId } = req.body;
    const { clientId, userId, facilityId } = req.params;
  
    const query = { clientId, user: userId };
    const limitation = await Limitation.findOne(query);
  
    if (!limitation) {
      throw new apiError(404, "No limitations found for the user.");
    }
  
    let filteredRules = limitation.rules;
  
    if (facilityId) {
      filteredRules = filteredRules.filter(rule =>
        rule.facility.toString() === facilityId.toString()
      );
    }
  
    return res.status(200).json(new apiResponse(200, filteredRules, "Limitation rules fetched successfully"));
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
    