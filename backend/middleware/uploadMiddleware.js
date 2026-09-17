import multer from "multer";

/*
========================================
MEMORY STORAGE
========================================
*/

const storage = multer.memoryStorage();

/*
========================================
FILE FILTER
========================================
*/

const fileFilter = (req, file, cb) => {
  const mimetype = file.mimetype || "";
  const originalname = file.originalname || "";

  // Check common image MIME types (e.g., image/jpeg, image/png, image/webp, image/svg+xml, image/gif, image/avif, image/bmp, image/tiff, image/heic, etc.)
  const isImageMime =
    mimetype.startsWith("image/") ||
    mimetype === "application/octet-stream";

  // Check known image file extensions
  const isImageExt =
    /\.(jpg|jpeg|png|webp|svg|gif|avif|bmp|tiff|tif|ico|heic|heif|jfif|raw|cr2|nef|eps|psd|ai)$/i.test(
      originalname
    );

  if (isImageMime || isImageExt) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed"), false);
  }
};

/*
========================================
MULTER
========================================
*/

const upload = multer({
  storage,

  fileFilter,

  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

export default upload;
