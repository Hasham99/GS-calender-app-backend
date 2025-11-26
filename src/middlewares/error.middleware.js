import { apiError } from "../utils/apiError.js";
import { logger } from "../utils/logger.js"; // Import the logger
const errorHandler = (err, req, res, next) => {

    // Log the error to the file
    logger.error(err.message, { 
        statusCode: err.statusCode,
        stack: err.stack,
        url: req.originalUrl,
        method: req.method,
        ip: req.ip
    });

    // Check if the error is an instance of apiError
    if (err instanceof apiError) {
        return res.status(err.statusCode).json({
            success: err.success,
            message: err.message,
            data: err.data,
            errors: err.errors,
        });
    }

    // For other unexpected errors
    console.error("Unexpected Error:", err);
    return res.status(500).json({
        success: false,
        message: "Internal Server Error",
        errors: [{ error: err.message }],
    });
};

export { errorHandler };
