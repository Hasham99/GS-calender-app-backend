import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";
import fs from "fs"

dotenv.config()

// Configuration
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET_KEY
});


const uploadOnCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) {
            return null
        }
        //upload file on cloudinary
        const response = await cloudinary.uploader.upload(localFilePath, { resource_type: "auto" })
        //for successful upload
        console.log("file uploaded cloudinary", response.url);
        fs.unlinkSync(localFilePath)
        return response;

    } catch (error) {
        //remove locally saved file if any error occurred during file upload
        fs.unlinkSync(localFilePath)

    }
}

export { uploadOnCloudinary }