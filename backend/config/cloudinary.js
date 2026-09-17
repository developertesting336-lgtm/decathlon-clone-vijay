import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";

dotenv.config();

const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

if (!cloudName || !apiKey || !apiSecret) {
  console.error("❌ Cloudinary configuration is missing!");

  console.error({
    CLOUDINARY_CLOUD_NAME: cloudName ? "LOADED" : "MISSING",

    CLOUDINARY_API_KEY: apiKey ? "LOADED" : "MISSING",

    CLOUDINARY_API_SECRET: apiSecret ? "LOADED" : "MISSING",
  });
}

cloudinary.config({
  cloud_name: cloudName,
  api_key: apiKey,
  api_secret: apiSecret,
});

console.log("✅ Cloudinary configured:", {
  cloud_name: cloudName,
  api_key: apiKey ? "LOADED" : "MISSING",
  api_secret: apiSecret ? "LOADED" : "MISSING",
});

export default cloudinary;
