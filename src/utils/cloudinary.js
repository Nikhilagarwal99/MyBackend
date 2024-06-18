import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import { ApiError } from "./ApiError.js";
import { ApiResponse } from "./ApiResponse.js";

// Configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET, // Click 'View Credentials' below to copy your API secret
});

const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) {
      return null;
    }
    //upload the file on cloudinary
    const uploadResult = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });
    //file is uploaded on cloudinary

    console.log("File is uploaded Successfully", uploadResult);
    fs.unlinkSync(localFilePath);
    return uploadResult;
  } catch (error) {
    fs.unlinkSync(localFilePath); //remove the locally saved temp file as the upload operation got failed
    return null;
  }
};

const deleteOnCloudinary = async (fileURL) => {
  if (!fileURL) {
    return new ApiError(404, "file not found");
  }
  const publicId = fileURL.split("/").pop().split(".")[0];
  const deleteResult = await cloudinary.uploader.destroy(publicId);
  return deleteResult;
};
export { uploadOnCloudinary, deleteOnCloudinary };
