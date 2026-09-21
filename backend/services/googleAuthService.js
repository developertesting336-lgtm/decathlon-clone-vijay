import { OAuth2Client } from "google-auth-library";

let client = null;

/**
 * Creates and caches the Google OAuth2 client.
 */
const getOAuthClient = () => {
  if (!client) {
    const googleClientId = process.env.GOOGLE_CLIENT_ID;

    if (!googleClientId) {
      throw new Error(
        "GOOGLE_CLIENT_ID is not configured in environment variables",
      );
    }

    client = new OAuth2Client(googleClientId);
  }

  return client;
};

/**
 * Verifies a Google ID Token (JWT) or an Access Token.
 * Supports Google Identity Services (GIS) and Google OAuth2 popups.
 *
 * @param {string} token
 * @returns {Promise<{
 *   googleId: string,
 *   email: string|null,
 *   name: string,
 *   picture: string,
 *   emailVerified: boolean,
 *   payload: object
 * }>}
 */
export const verifyGoogleIdToken = async (token) => {
  const googleClientId = process.env.GOOGLE_CLIENT_ID;

  if (!googleClientId) {
    throw new Error(
      "GOOGLE_CLIENT_ID is not configured in environment variables",
    );
  }

  // Validate incoming token
  if (!token || typeof token !== "string" || !token.trim()) {
    throw new Error("Google token is required");
  }

  const cleanToken = token.trim();
  const isJwt = cleanToken.split(".").length === 3;

  // 1. If it looks like a JWT, verify with google-auth-library
  if (isJwt) {
    try {
      const oauthClient = getOAuthClient();

      const ticket = await oauthClient.verifyIdToken({
        idToken: cleanToken,
        audience: googleClientId,
      });

      const payload = ticket.getPayload();

      if (payload && payload.sub) {
        const email = payload.email ? payload.email.trim().toLowerCase() : null;
        const name =
          payload.name ||
          payload.given_name ||
          (email ? email.split("@")[0] : "Google User");
        const picture = payload.picture || "";
        const emailVerified = Boolean(payload.email_verified);

        return {
          googleId: payload.sub,
          email,
          name,
          picture,
          emailVerified,
          payload,
        };
      }
    } catch (jwtError) {
      console.warn(
        "Google ID Token verification failed, falling back to userinfo check:",
        jwtError.message,
      );
    }
  }

  // 2. Fallback: Verify via Google OAuth2 Userinfo endpoint (supports access tokens)
  try {
    const response = await fetch(
      "https://www.googleapis.com/oauth2/v3/userinfo",
      {
        headers: {
          Authorization: `Bearer ${cleanToken}`,
        },
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Google userinfo returned status ${response.status}: ${errorText}`);
    }

    const data = await response.json();

    if (!data.sub) {
      throw new Error("Google userinfo did not contain a user ID (sub)");
    }

    const email = data.email ? data.email.trim().toLowerCase() : null;
    const name =
      data.name ||
      data.given_name ||
      (email ? email.split("@")[0] : "Google User");
    const picture = data.picture || "";
    const emailVerified = Boolean(data.email_verified);

    return {
      googleId: data.sub,
      email,
      name,
      picture,
      emailVerified,
      payload: data,
    };
  } catch (userinfoError) {
    throw new Error(
      `Failed to verify Google token: ${userinfoError.message}`,
    );
  }
};

export const verifyGoogleToken = verifyGoogleIdToken;

export default {
  verifyGoogleIdToken,
  verifyGoogleToken,
};

