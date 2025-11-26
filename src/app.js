import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import fs from "fs"; // Import fs
import path from "path"; // Import path
import helmet from "helmet";
import { errorHandler } from "./middlewares/error.middleware.js";
import authRoutes from "./routes/auth.routes.js";
import facilityRoutes from "./routes/facility.routes.js";
import bookingRoutes from "./routes/booking.routes.js";
import clientRoutes from "./routes/client.routes.js";
import LimitationRoutes  from "./routes/limitation.routes.js";

// Initialize the Express app
const app = express();

// 🧠 Environment flag
const isProduction = process.env.NODE_ENV === "production";

// 🛡️ Security headers middleware
app.use(helmet());

// 🌍 CORS configuration
// const allowedOrigins = [
//   "https://gs-bookable-cc.web.app", // production frontend
//   "http://localhost:5173",          // local React/Vite frontend
//   "http://localhost:4775"           // local backend testing

// ];

// allow origin all






// app.use(
//   cors({
//     origin: (origin, callback) => {
//       if (!origin || allowedOrigins.includes(origin)) {
//         callback(null, true);
//       } else {
//         console.warn(`🚨 Blocked CORS request from untrusted origin: ${origin}`);
//         callback(new Error("Not allowed by CORS"));
//       }
//     },
//     credentials: true,
//   })
// );

// Middleware configuration
// app.use(
//     cors({
//         // origin: process.env.CORS_ORIGIN || "*", // Allow CORS from defined origin or all origins
//         origin: "http://localhost:5173",
//         credentials: true,
//     })
// );

app.use(
  cors({
    origin: "*", // Temporarily allow all origins
    credentials: true,
  })
);

// save error and success logs to file



app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));
app.use(cookieParser());


// 📝 LOGGING CONFIGURATION
// Ensure logs directory exists
const logDirectory = path.join(process.cwd(), "logs");
if (!fs.existsSync(logDirectory)) {
  fs.mkdirSync(logDirectory);
}

// Create a write stream (in append mode)
const accessLogStream = fs.createWriteStream(path.join(logDirectory, "access.log"), {
  flags: "a",
});

// Save logs to file
app.use(morgan("combined", { stream: accessLogStream }));
// Keep logging to console in dev mode
app.use(morgan("dev"));



// 🚫 Block malicious WP/PHP scan requests
app.use((req, res, next) => {
  const blockedPatterns = [
    ".php",
    "wp-content",
    "wp-admin",
    "tinyfilemanager",
    "autoload_classmap",
    "xmlrpc.php",
    "filemanager",
    "vendor",
    "composer.json",
    "config.php",
    "gecko.php",
    "shell",
  ];

  if (blockedPatterns.some((pattern) => req.url.toLowerCase().includes(pattern))) {
    console.warn(`🚨 Suspicious request blocked: ${req.method} ${req.url} | IP: ${req.ip}`);
    return res.status(403).json({
      success: false,
      message: "Forbidden: Suspicious activity detected",
    });
  }

  next();
});
// API routes
app.use("/api/v1/auth", authRoutes); // Authentication routes
app.use("/api/v1/facility", facilityRoutes); // Facility routes
app.use("/api/v1/booking", bookingRoutes); // Booking routes
app.use("/api/v1/client", clientRoutes); // Booking routes
app.use("/api/v1/limitation", LimitationRoutes); // Booking routes

// 🧱 Catch-all route for unknown APIs (return 404, not React index)
app.all("/api/*", (req, res) => {
  res.status(404).json({
    success: false,
    message: "API route not found",
  });
});

// 🧭 Root endpoint (for uptime monitoring)
app.get("/", (req, res) => {
  res.send(`✅ GS Bookable API is running - Environment: ${isProduction ? "Production" : "Development"}`);
});

// Root route for health check (optional)
// app.use("/", (req, res) => {
//     res.send(`
//       <html>
//         <head>
//           <style>
//             body {
//               background-color: #111;
//               color: #fff;
//               font-family: Arial, sans-serif;
//             }
//             .accordion {
//               background-color: #222;
//               color: #fff;
//               cursor: pointer;
//               padding: 10px;
//               margin: 5px 0;
//               border-radius:10px;
//               width: 100%;
//               border: none;
//               text-align: left;
//               outline: none;
//               font-size: 18px;
//               transition: 0.4s;
//             }
//             .accordion:hover {
//               background-color: #333;
//             }
//             .panel {
//               padding: 0 15px;
//               border-radius:10px;
//               background-color: #333;
//               display: none;
//               overflow: hidden;
//             }
//             ul {
//               list-style-type: none;
//               padding: 0;
//             }
//             li {
//               padding: 8px;
//               border-bottom: 1px solid #555;
//             }
//           </style>
//         </head>
//         <body>
//           <h2>API Documentation</h2>
  
//           <button class="accordion">/api/v1/auth</button>
//           <div class="panel">
//             <h4>GET</h4>
//             <ul>
//               <li>router.route("/users/:role").get(getAllUsersByRoleController);</li>
//               <li>router.route("/user/:id").get(getAllUsersByIdController);</li>
//               <li>router.route("/users").get(getAllUsersController);</li>
//             </ul>
//             <h4>POST</h4>
//             <ul>
//               <li>router.route("/forgot-password").post(ForgotPasswordController);</li>
//               <li>router.route("/user/verify-email").post(verifyJWT, verifyEmailOtpController);</li>
//               <li>router.route("/register").post(verifyJWT, registerControllerByAdminClient);</li>
//               <li>router.route("/self-register/:clientId").post(selfRegisterController);</li>
//               <br/>
//               <br/>
//               <li>router.route("/login").post(loginController);</li>
//               <br/>
//               <br/>
//               <li>router.route("/send-otp").post(sendOtpController);</li>
//               <li>router.route("/verify-otp").post(verifyOtpController);</li>
//               <br/>
//               <br/>
//               <li>router.route("/invite-user").post(verifyJWT, authorizeRoles("admin"), inviteUserController);</li>
//               <li>router.route("/invite-accept/:id").post(acceptInviteController);</li>
//             </ul>
//             <h4>PUT</h4>
//             <ul>
//             <li>router.route("/user/:id").put(verifyJWT, updateUserController);</li>
//             </ul>
//             <h4>DELETE</h4>
//             <ul>
//             <li>router.route("/user/:id").delete(verifyJWT, isAdminController, deleteUserByIdController);</li>
//             </ul>
//           </div>
  
//           <button class="accordion">/api/v1/facility</button>
//           <div class="panel">
//           <h4>GET</h4>
//             <ul>
//               <li>router.route("/").get(getFacilitiesController);</li>
//               <li>router.route("/:id").get(verifyJWT, getFacilitiesByIdController);</li>
//             </ul>
//             <h4>UPDATE</h4>
//             <ul>
//               <li>router.route("/:id").delete(verifyJWT, deleteFacilityController);</li>
//             </ul>
//             <h4>DELETE</h4>
//             <ul>
//               <li>router.route("/").post(verifyJWT, authorizeRoles("admin"), createFacilityController);</li>
//             </ul>
//           </div>
  
//           <button class="accordion">/api/v1/booking</button>
//           <div class="panel">
//           <h4>GET</h4>
//             <ul>
//               <li>router.route("/").get(getBookingsController);</li>
//               <li>router.route("/booking-history").get(getBookingHistoryController);</li>
//               <li>router.route("/booking-history/:id").get(getBookingHistoryByUserIdController);</li>
//               <li>router.route("/cleanup").get(autoCleanUpBookingsController);</li>
//             </ul>
//           <h4>POST</h4>
//             <ul>
//               <li>router.route("/").post(verifyJWT, createBookingController);</li>
//             </ul>
//           <h4>UPDATE</h4>
//             <ul>
//               <li>router.route("/:id").put(verifyJWT, updateBookingController);</li>
//             </ul>
//           <h4>DELETE</h4>
//             <ul>
//               <li>router.route("/:id").delete(verifyJWT, deleteBookingController);</li>
//             </ul>            
//           </div>
  
//           <button class="accordion">/api/v1/client</button>
//           <div class="panel">
//           <h4>GET</h4>
//             <ul>
//               <li>router.route("/").get(getClientsController);</li>
//               <li>router.route("/:clientId").get(getClientsController);</li>
//             </ul>
            
//             <h4>POST</h4>
//             <ul>
//               <li>router.route("/user").post(registerControllerByAdminClient);</li>
//               <li>router.route("/login").post(loginClientController);</li>
//               <li>router.route("/register").post(createClientController);</li>
//             </ul>
//             </div>
  
//           <script>
//             var acc = document.getElementsByClassName("accordion");
//             for (var i = 0; i < acc.length; i++) {
//               acc[i].addEventListener("click", function() {
//                 this.classList.toggle("active");
//                 var panel = this.nextElementSibling;
//                 if (panel.style.display === "block") {
//                   panel.style.display = "none";
//                 } else {
//                   panel.style.display = "block";
//                 }
//               });
//             }
//           </script>
//         </body>
//       </html>
//     `);
// });
  
// Global error handler
app.use(errorHandler);

export { app };
