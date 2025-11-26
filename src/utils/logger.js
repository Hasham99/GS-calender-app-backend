import winston from "winston";
import path from "path";
import fs from "fs";

// Ensure logs directory exists
const logDirectory = path.join(process.cwd(), "logs");
if (!fs.existsSync(logDirectory)) {
  fs.mkdirSync(logDirectory);
}

const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp({
      format: "YYYY-MM-DD HH:mm:ss",
    }),
    winston.format.json()
  ),
  transports: [
    // Write all error logs to `logs/error.log`
    new winston.transports.File({ 
      filename: path.join(logDirectory, "error.log"), 
      level: "error" 
    }),
    // Write all logs (info, success, error) to `logs/combined.log`
    new winston.transports.File({ 
      filename: path.join(logDirectory, "combined.log") 
    }),
  ],
});

// If not in production, also log to the console
if (process.env.NODE_ENV !== "production") {
  logger.add(
    new winston.transports.Console({
      format: winston.format.simple(),
    })
  );
}

export { logger };