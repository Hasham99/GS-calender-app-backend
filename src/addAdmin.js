import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import { User } from './models/user.model.js';  // Ensure the path to the model is correct
import dotenv from "dotenv";

dotenv.config({
    path: './.env'  // Ensure the path to the .env file is correct
});

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
    .then(async () => {
        const email = "test@admin.com";  // Unique email for the new admin

        // Check if the user already exists by email
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            console.log("User with this email already exists. Skipping creation.");
            mongoose.connection.close();  // Close the connection
            return;
        }

        // Hash the password for the admin user
        const hashedPassword = await bcrypt.hash('test', 10);  // Example password "new"

        // Create a new admin user
        const adminUser = new User({
            name: "test",
            email: email,
            password: hashedPassword,  // Hashed password
            role: "admin",  // Setting the role to "admin"
        });

        // Save the admin user to the database
        await adminUser.save();
        console.log("Admin user added successfully!");

        // Close the MongoDB connection
        mongoose.connection.close();
    })
    .catch(err => {
        console.error("Error:", err);
        mongoose.connection.close();  // Close the connection in case of error
    });
