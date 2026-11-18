import uploadToCloudinary from "../utils/uploadToCloudinary.js";
import Product from "../models/Product.js";
import genlookService from "../services/genlookService.js";

// Standard Decathlon Models permanently hosted on Cloudinary (All Full-Body Standing)
const PRESET_MODELS = [
  {
    id: 0,
    label: "Male Model (Athletic Standing)",
    gender: "male",
    sampleIndex: 0,
    previewUrl:
      "https://res.cloudinary.com/k08sqqki/image/upload/v1794999501/decathlon/models/vwrytbqb1twoo2zw1has.jpg",
  },
  {
    id: 1,
    label: "Female Model (Decathlon Standing)",
    gender: "female",
    sampleIndex: 1,
    previewUrl:
      "https://res.cloudinary.com/k08sqqki/image/upload/v1794999499/decathlon/models/ht03hdxzyauxhpygqwic.jpg",
  },
  {
    id: 2,
    label: "Female Model (Sportswear Standing)",
    gender: "female",
    sampleIndex: 2,
    previewUrl:
      "https://res.cloudinary.com/k08sqqki/image/upload/v1794999640/decathlon/models/fajani6cccs7qebmrb5e.jpg",
  },
  {
    id: 3,
    label: "Male Model (Athletic Runner)",
    gender: "male",
    sampleIndex: 3,
    previewUrl:
      "https://res.cloudinary.com/k08sqqki/image/upload/v1794996405/decathlon/models/x3r25h83smfzt6r4erzf.jpg",
  },
];

/**
 * Get intelligent Decathlon AI fit and styling advice using Google Gemini API
 */
const getGeminiFitStyling = async (garmentName, category, gender = "Unisex") => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  try {
    const prompt = `You are Decathlon's official AI Fitting Room Stylist & Ergonomic Specialist.
Garment: "${garmentName}" (Category: ${category || "Sportswear"}, Gender: ${gender}).
Provide an authentic, highly useful fit & styling review:
1. Fit Verdict (e.g., "Slim athletic fit with tapered ankle", "Relaxed ergonomic drape")
2. Movement & Fabric Feel: How it behaves during running, gym workouts, or hiking
3. Decathlon Styling Tip: Recommended pairing with footwear or complimentary tops/shorts.
Keep your response concise, professional, encouraging, and under 50 words total.`;

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      }
    );

    if (!res.ok) return null;
    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || null;
  } catch (err) {
    console.warn("Gemini styling advice warning:", err.message);
    return null;
  }
};

/**
 * GET /api/try-on/models
 * Returns available Decathlon preset models
 */
export const getPresetModels = async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      models: PRESET_MODELS,
    });
  } catch (error) {
    console.error("Error fetching preset models:", error);
    return res.status(500).json({
      success: false,
      message: "Could not retrieve preset models",
      error: error.message,
    });
  }
};

/**
 * GET /api/try-on/credits
 * Returns the current available Genlook Try-On credit balance
 */
export const getTryOnCredits = async (req, res) => {
  try {
    const { creditBalance } = await genlookService.getCredits();
    return res.status(200).json({
      success: true,
      credits: creditBalance,
    });
  } catch (error) {
    console.warn("Could not check Genlook credits:", error.message);
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Failed to check credit balance",
      credits: 0,
    });
  }
};

/**
 * POST /api/try-on/generate
 * Handles Decathlon Fitting Room Virtual Try-On using Genlook AI API + Google Gemini
 */
export const generateVirtualTryOn = async (req, res) => {
  try {
    const {
      userImageUrl,
      presetModelIndex,
      garmentImageUrl: rawGarmentImageUrl,
      garmentDescription: rawGarmentDescription,
      productId,
      mock,
    } = req.body;

    let garmentImageUrl = rawGarmentImageUrl;
    let garmentDescription = rawGarmentDescription || "Decathlon Sportswear";
    let productCategoryName = "";
    let productGender = "Unisex";

    // 1. Resolve product info from MongoDB if productId provided
    if (productId) {
      try {
        const product = await Product.findById(productId).populate("category");
        if (product) {
          const productImages = Array.isArray(product.images)
            ? product.images
            : product.image
            ? [product.image]
            : [];
          if (!garmentImageUrl && productImages[0]) {
            garmentImageUrl = productImages[0];
          }
          if (!rawGarmentDescription && product.name) {
            garmentDescription = product.name;
          }
          productCategoryName =
            product.category?.name ||
            (typeof product.category === "string" ? product.category : "");
          productGender = product.gender || "Unisex";
        }
      } catch (err) {
        console.warn("Could not lookup product by id:", err.message);
      }
    }

    if (!garmentImageUrl) {
      return res.status(400).json({
        success: false,
        message: "A valid garment image is required for Virtual Try-On.",
      });
    }

    const uploadedUserFile = req.files?.userImage?.[0];

    // Validation: Require model or user photo
    const hasUserSource =
      uploadedUserFile ||
      userImageUrl ||
      (presetModelIndex !== undefined && presetModelIndex !== null && presetModelIndex !== "");
    if (!hasUserSource) {
      return res.status(400).json({
        success: false,
        message: "Please choose a Decathlon model or upload your photo.",
      });
    }

    // 2. Check Genlook Credit Balance beforehand to avoid failing mid-way
    let currentCredits = 10;
    try {
      const creditInfo = await genlookService.getCredits();
      currentCredits = creditInfo.creditBalance;
      if (currentCredits <= 0) {
        return res.status(400).json({
          success: false,
          code: "INSUFFICIENT_CREDITS",
          message:
            "Your Genlook Virtual Try-On credits are currently exhausted (0 remaining). Please contact support or replenish credits.",
        });
      }
    } catch (creditErr) {
      console.warn("Credit check warning:", creditErr.message);
      if (creditErr.code === "INSUFFICIENT_CREDITS") {
        return res.status(400).json({
          success: false,
          code: "INSUFFICIENT_CREDITS",
          message:
            "Your Genlook Virtual Try-On credits are exhausted. Please contact support or replenish credits.",
        });
      }
    }

    // 3. Resolve Person Image (upload buffer to Genlook or use Preset Model URL)
    let personImageId = null;
    let personImageUrl = null;
    let modelImageUrl = null;

    if (uploadedUserFile) {
      console.log("📤 Uploading user photo to Genlook API...");
      const uploadRes = await genlookService.uploadPersonImage(
        uploadedUserFile.buffer,
        uploadedUserFile.mimetype || "image/jpeg",
        uploadedUserFile.originalname || "user_photo.jpg"
      );
      personImageId = uploadRes.imageId;
      modelImageUrl = uploadRes.imageUrl;

      // Also backup upload to Cloudinary asynchronously for permanent customer record
      uploadToCloudinary(uploadedUserFile.buffer, "decathlon/try-on/user_uploads").catch((e) =>
        console.warn("Cloudinary backup upload warning:", e.message)
      );
    } else if (userImageUrl) {
      personImageUrl = userImageUrl;
      modelImageUrl = userImageUrl;
    } else {
      const pIdx = parseInt(presetModelIndex, 10) || 0;
      const chosenModel = PRESET_MODELS[pIdx] || PRESET_MODELS[0];
      personImageUrl = chosenModel.previewUrl;
      modelImageUrl = chosenModel.previewUrl;
    }

    // 4. Run Virtual Try-On via Genlook API
    console.log(
      `👗 Triggering Genlook Virtual Try-On for: "${garmentDescription}" (URL: ${garmentImageUrl.slice(
        0,
        60
      )}...)`
    );

    const tryOnResult = await genlookService.createVirtualTryOn({
      personImageUrl,
      personImageId,
      productExternalId: productId || "decathlon-garment",
      productTitle: garmentDescription,
      productDescription: `${garmentDescription} - ${productCategoryName}`,
      garmentImageUrl,
      mock: mock === true || mock === "true",
    });

    // 5. Query Google Gemini in parallel for fit & style insights
    const geminiAdvice = await getGeminiFitStyling(
      garmentDescription,
      productCategoryName,
      productGender
    );

    // 6. Get updated remaining credits
    let remainingCredits = currentCredits - 1;
    try {
      const updatedCredits = await genlookService.getCredits();
      remainingCredits = updatedCredits.creditBalance;
    } catch {
      // ignore
    }

    console.log(
      `✅ Try-On completed successfully! Gen ID: ${tryOnResult.generationId}, Remaining Credits: ${remainingCredits}`
    );

    return res.status(200).json({
      success: true,
      resultImageUrl: tryOnResult.resultImageUrl,
      modelImageUrl,
      garmentImageUrl,
      geminiAdvice:
        geminiAdvice ||
        "Ergonomic athletic fit designed for maximum mobility and performance.",
      creditsRemaining: remainingCredits,
    });
  } catch (error) {
    console.error("❌ Decathlon Fitting Room Error:", error);
    return res.status(error.status || 500).json({
      success: false,
      code: error.code || "TRYON_ERROR",
      message:
        error.message ||
        "Decathlon Fitting Room generation failed. Please try again.",
      error: error.message,
    });
  }
};
