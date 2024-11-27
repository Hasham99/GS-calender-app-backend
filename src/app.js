import express from "express";
import cors from "cors"
import cookieParser from "cookie-parser";
import { errorHandler } from "./middlewares/error.middleware.js";

const app = express();

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true

}))

app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));
app.use(cookieParser())
app.use(morgan('dev'))


//routes import
// import userRouter from "./routes/user.routes.js";
import authRoutes from "./routes/auth.routes.js";
import morgan from "morgan";

//routes declaration
// app.use("/api/v1/users", userRouter);
app.use("/api/v1/auth", authRoutes);


// app.use("/", (req, res) => {
//     res.send("working")
// })

// http://localhost:8090//api/v1/users/register


app.use(errorHandler);


export { app }