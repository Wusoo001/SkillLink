const jwt = require("jsonwebtoken");
const User = require("../models/User");

/**
 * Attaches req.user if a valid Bearer token is present.
 * Never blocks the request — invalid/missing token = anonymous viewer.
 * Used by public-but-viewer-aware endpoints (e.g. ranked feed).
 */
const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    try {
      const token = authHeader.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const userId = decoded.id || decoded.userId;
      if (userId) {
        req.user = await User.findById(userId).select("-password");
      }
    } catch (e) {
      // invalid or expired token → treat as anonymous, do not fail
    }
  }
  next();
};

module.exports = optionalAuth;