import cloudinary from "../config/cloudinary.js";
import streamifier from "streamifier";

/*
========================================
UPLOAD BUFFER TO CLOUDINARY
========================================
*/

const uploadToCloudinary = (buffer, folder = "decathlon") => {
  return new Promise((resolve, reject) => {
    try {
      if (!buffer) {
        return reject(new Error("Image buffer is missing"));
      }

      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: "auto",
        },
        (error, result) => {
          if (error) {
            console.error("❌ Cloudinary Upload Error:", error);

            return reject(error);
          }

          if (!result) {
            return reject(new Error("Cloudinary returned no result"));
          }

          resolve(result);
        },
      );

      streamifier.createReadStream(buffer).pipe(uploadStream);
    } catch (error) {
      console.error("❌ Cloudinary Upload Exception:", error);

      reject(error);
    }
  });
};

/*
========================================
GET SINGLE IMAGE URL
========================================
*/

export const getSingleImageUrl = async (file, folder = "decathlon") => {
  if (!file) {
    return "";
  }

  /*
  MULTER MEMORY STORAGE
  */

  if (file.buffer) {
    const result = await uploadToCloudinary(file.buffer, folder);

    return result.secure_url;
  }

  /*
  MULTER DISK STORAGE
  */

  if (file.filename) {
    return `/uploads/${file.filename}`;
  }

  return "";
};

/*
========================================
GET MULTIPLE IMAGE URLS
========================================
*/

export const getMultipleImageUrls = async (files, folder = "decathlon") => {
  if (!files || !Array.isArray(files) || files.length === 0) {
    return [];
  }

  const uploadPromises = files.map((file) => getSingleImageUrl(file, folder));

  return await Promise.all(uploadPromises);
};

/*
========================================
EXPORT
========================================
*/

export default uploadToCloudinary;
