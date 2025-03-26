import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

// Configure the email transporter
// const transporter = nodemailer.createTransport({
//     service: "Gmail", // or your preferred email service
//     auth: {
//         user: process.env.EMAIL_USER, // Your email address
//         pass: process.env.EMAIL_PASS, // Your email password or app password
//     },
// });

// Configure the email transporter for Zoho Mail
const transporter = nodemailer.createTransport({
    host: "smtp.zoho.com",  // Zoho SMTP server
    port: 465,              // Use 465 for SSL, or 587 for TLS
    secure: true,           // true for 465 (SSL), false for 587 (TLS)
    auth: {
        user: process.env.EMAIL_USER, // Your Zoho email (e.g., yourname@yourdomain.com)
        pass: process.env.EMAIL_PASS, // Your Zoho email password or App Password
    },
});

// Function to send an email
export const sendEmail = async (to, subject, text) => {
    try {
        const info = await transporter.sendMail({
            from: process.env.EMAIL_USER, // Sender address
            to, // Receiver's email address
            subject, // Subject of the email
            text, // Email body
        });

        console.log("Email sent:", info.response);
        return true;
    } catch (error) {
        console.error("Error sending email:", error);
        return false;
    }
};
