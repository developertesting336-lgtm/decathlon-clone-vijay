import crypto from "crypto";

const OFFICIAL_GENLOOK_BASE_URL = "https://api.genlook.app/tryon/v1";

/**
 * Robust base URL resolver:
 * Automatically sanitizes or falls back to the official Genlook endpoint
 * if the environment variable contains typos (e.g. /tryon/v16. or trailing dots).
 */
const getBaseUrl = () => {
  const envUrl = process.env.GENLOOK_API_BASE_URL;
  if (!envUrl || typeof envUrl !== "string") {
    return OFFICIAL_GENLOOK_BASE_URL;
  }
  const clean = envUrl.trim().replace(/[/.]+$/, "");
  if (!clean.startsWith("http") || clean.includes("v16") || !clean.includes("genlook.app")) {
    return OFFICIAL_GENLOOK_BASE_URL;
  }
  return clean;
};

/**
 * Helper to get clean API key
 */
const getApiKey = () => {
  const key = process.env.GENLOOK_API_KEY;
  if (!key) {
    throw new Error(
      "GENLOOK_API_KEY is not configured in backend environment variables."
    );
  }
  return key.trim();
};

/**
 * Friendly error messages for Genlook stable error codes
 */
const formatGenlookError = (code, rawMessage) => {
  switch (code) {
    case "INSUFFICIENT_CREDITS":
      return "Your Genlook Virtual Try-On credit balance is exhausted. Please contact support or replenish credits.";
    case "NO_PERSON_DETECTED":
      return "No person detected in the photo. Please upload a clear front-facing full-body or half-body photo.";
    case "PERSON_IMAGE_TOO_SMALL":
      return "Uploaded person photo resolution is too low. Please use a higher quality photo.";
    case "PERSON_IMAGE_BLANK":
      return "The person image appears blank or unreadable. Please upload a valid photo.";
    case "PERSON_TOO_FAR":
      return "The person is too far from the camera. Please use a closer, clear shot.";
    case "CONTENT_POLICY_VIOLATION":
      return "The uploaded image could not be processed due to content safety policy.";
    case "RATE_LIMITED":
      return "Genlook API rate limit reached. Please wait a few seconds and try again.";
    case "GENERATION_TIMEOUT":
      return "The virtual try-on took longer than expected and timed out. Any deducted credit was refunded; please retry.";
    case "PRODUCT_IMAGE_FETCH_FAILED":
    case "CUSTOMER_IMAGE_FETCH_FAILED":
      return "Could not fetch the product or person image. Please check the image link and try again.";
    default:
      return (
        rawMessage ||
        "An unexpected error occurred during Virtual Try-On generation. Please try again."
      );
  }
};

/**
 * Get available credit balance
 * GET /tryon/v1/account/credits
 */
export const getCredits = async () => {
  const apiKey = getApiKey();
  const url = `${getBaseUrl()}/account/credits`;

  const res = await fetch(url, {
    method: "GET",
    headers: {
      "x-api-key": apiKey,
    },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    const message = formatGenlookError(
      errorData.code,
      errorData.message || `Credits check failed (${res.status})`
    );
    const err = new Error(message);
    err.code = errorData.code;
    err.status = res.status;
    throw err;
  }

  const data = await res.json();
  return {
    creditBalance: typeof data.creditBalance === "number" ? data.creditBalance : 0,
  };
};

/**
 * Upload a person photo to Genlook
 * POST /tryon/v1/images/upload
 * Free endpoint, crops to 4:5 frame and returns imageId
 */
export const uploadPersonImage = async (
  buffer,
  mimeType = "image/jpeg",
  filename = "person.jpg"
) => {
  const apiKey = getApiKey();
  const url = `${getBaseUrl()}/images/upload`;

  const formData = new FormData();
  formData.append(
    "file",
    new Blob([buffer], { type: mimeType }),
    filename
  );

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
    },
    body: formData,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    const message = formatGenlookError(
      errorData.code,
      errorData.message || `Person photo upload failed (${res.status})`
    );
    const err = new Error(message);
    err.code = errorData.code;
    err.status = res.status;
    throw err;
  }

  const data = await res.json();
  return {
    imageId: data.imageId,
    imageUrl: data.imageUrl,
  };
};

/**
 * Poll generation status until completed or failed
 * GET /tryon/v1/generations/:id
 */
export const pollGeneration = async (
  generationId,
  maxAttempts = 24,
  delayMs = 2500
) => {
  const apiKey = getApiKey();
  const url = `${getBaseUrl()}/generations/${generationId}`;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, delayMs));

    const res = await fetch(url, {
      method: "GET",
      headers: {
        "x-api-key": apiKey,
      },
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      const message = formatGenlookError(
        errorData.code,
        errorData.message || "Failed checking generation status"
      );
      const err = new Error(message);
      err.code = errorData.code;
      err.status = res.status;
      throw err;
    }

    const data = await res.json();
    if (data.status === "COMPLETED" && data.resultImageUrl) {
      return {
        generationId: data.generationId,
        status: "COMPLETED",
        resultImageUrl: data.resultImageUrl,
      };
    }

    if (data.status === "FAILED") {
      const message = formatGenlookError(
        data.errorCode,
        data.errorMessage || "Virtual Try-On generation failed."
      );
      const err = new Error(message);
      err.code = data.errorCode;
      throw err;
    }
  }

  throw new Error("Virtual Try-On generation timed out. Please try again.");
};

/**
 * Create a try-on request and wait for the result
 * Uses POST /tryon/v1/try-on/sync (with automatic fallback to polling if 202 is returned)
 */
export const createVirtualTryOn = async ({
  personImageUrl,
  personImageId,
  productExternalId,
  productTitle,
  productDescription,
  garmentImageUrl,
  mock = false,
}) => {
  const apiKey = getApiKey();
  const url = `${getBaseUrl()}/try-on/sync`;

  if (!garmentImageUrl) {
    throw new Error("Garment image URL is required for Virtual Try-On.");
  }

  if (!personImageUrl && !personImageId) {
    throw new Error("Person image (URL or imageId) is required for Virtual Try-On.");
  }

  // Construct person image source
  const personSource = personImageId
    ? { id: personImageId }
    : { url: personImageUrl };

  const payload = {
    products: [
      {
        externalId: String(productExternalId || "decathlon-product"),
        title: String(productTitle || "Decathlon Sportswear").slice(0, 100),
        description: String(
          productDescription || "Authentic Decathlon sports apparel"
        ).slice(0, 300),
        images: [
          {
            source: {
              url: garmentImageUrl,
            },
          },
        ],
      },
    ],
    person: {
      image: {
        source: personSource,
      },
    },
    mock: Boolean(mock),
  };

  const idempotencyKey = crypto.randomUUID();

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify(payload),
  });

  // Handle 200: Finished synchronously
  if (res.status === 200) {
    const data = await res.json();
    return {
      success: true,
      generationId: data.generationId,
      status: data.status,
      resultImageUrl: data.resultImageUrl,
    };
  }

  // Handle 202: Still running after 90s, poll until done
  if (res.status === 202) {
    const data = await res.json();
    if (data.generationId) {
      return await pollGeneration(data.generationId);
    }
  }

  // Handle Error statuses
  const errorData = await res.json().catch(() => ({}));
  const message = formatGenlookError(
    errorData.code,
    errorData.message || `Virtual Try-On request failed (${res.status})`
  );
  const err = new Error(message);
  err.code = errorData.code;
  err.status = res.status;
  err.details = errorData.details;
  throw err;
};

export default {
  getCredits,
  uploadPersonImage,
  pollGeneration,
  createVirtualTryOn,
};
