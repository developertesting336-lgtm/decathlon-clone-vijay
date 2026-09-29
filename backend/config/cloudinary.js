import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";
import https from "https";

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

let timeOffsetMs = 0;
let hasSynced = false;

export const syncCloudinaryTime = () => {
  return new Promise((resolve) => {
    https
      .get("https://api.cloudinary.com", (res) => {
        if (res.headers.date) {
          const serverTime = new Date(res.headers.date).getTime();
          const localTime = Date.now();
          timeOffsetMs = serverTime - localTime;
          hasSynced = true;
          console.log(
            `⏱️ Cloudinary time offset synchronized: ${Math.round(
              timeOffsetMs / 1000
            )}s`
          );
        }
        resolve(timeOffsetMs);
      })
      .on("error", (err) => {
        console.warn("⚠️ Could not sync time with Cloudinary:", err.message);
        resolve(0);
      });
  });
};

// Immediate sync on startup
syncCloudinaryTime();

// Periodic sync every 15 minutes (unref so it doesn't block shutdown or test scripts)
setInterval(syncCloudinaryTime, 15 * 60 * 1000).unref();

// Override Cloudinary SDK timestamp function to always use synchronized Cloudinary server time
cloudinary.utils.timestamp = () => {
  return Math.floor((Date.now() + timeOffsetMs) / 1000);
};

console.log("✅ Cloudinary configured:", {
  cloud_name: cloudName,
  api_key: apiKey ? "LOADED" : "MISSING",
  api_secret: apiSecret ? "LOADED" : "MISSING",
});

export default cloudinary;
