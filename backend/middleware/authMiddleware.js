import jwt from "jsonwebtoken";

/**
 * Decode and verify a Bearer JWT from req.user or the Authorization header without throwing.
 */
export const getVerifiedUserFromRequest = (req) => {
  if (req?.user) {
    return req.user;
  }

  try {
    const authHeader = req?.headers?.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ") || !process.env.JWT_SECRET) {
      return null;
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
      return null;
    }

    return jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return null;
  }
};

/**
 * Return true only when the request carries a verified admin JWT.
 */
export const isRequestAdmin = (req) => {
  const user = getVerifiedUserFromRequest(req);
  return Boolean(user && (user.role === "admin" || user.isAdmin === true));
};

const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "Authentication token required",
      });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = decoded;

    next();
  } catch (error) {
    return res.status(401).json({
      message: "Invalid or expired token",
    });
  }
};

export default authMiddleware;