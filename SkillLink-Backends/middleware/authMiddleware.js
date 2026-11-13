const jwt = require("jsonwebtoken");
const User = require("../models/User");

const protect = async (req, res, next) => {
  try {
    // ===== Token source priority =====
    // 1. httpOnly cookie (admin panel) — preferred
    // 2. Authorization header (mobile app) — fallback
    let token = req.cookies?.adminToken;

    if (!token && req.headers.authorization?.startsWith("Bearer")) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return res.status(401).json({
        code: "TOKEN_MISSING",
        message: "No token provided",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.id || decoded.userId;
    if (!userId) {
      return res.status(401).json({ code: "TOKEN_INVALID", message: "Invalid token payload" });
    }

    const user = await User.findById(userId).select("-password");
    if (!user) {
      return res.status(401).json({ code: "TOKEN_INVALID", message: "User not found" });
    }

    // ===== H3: password-change token invalidation =====
    // If the user changed their password after this token was minted → reject.
    // Only applies if passwordChangedAt is set (null for existing users).
    if (
      user.passwordChangedAt &&
      decoded.iat &&
      decoded.iat * 1000 < user.passwordChangedAt.getTime()
    ) {
      return res.status(401).json({
        code: "TOKEN_REVOKED",
        message: "Session invalidated. Please log in again.",
      });
    }

    // ===== Ban/suspend checks =====
    const isBanned = user.isBanned === true;
    const isSuspended =
      user.suspendedUntil && new Date(user.suspendedUntil) > new Date();

    if (isBanned || isSuspended) {
      return res.status(403).json({
        code: isBanned ? "ACCOUNT_BANNED" : "ACCOUNT_SUSPENDED",
        message: isBanned
          ? user.banReason || "This account has been banned."
          : `Account suspended until ${user.suspendedUntil.toISOString().split("T")[0]}.`,
        restriction: {
          type: isBanned ? "ban" : "suspension",
          reason: isBanned ? user.banReason : user.suspendReason,
          bannedAt: user.bannedAt || null,
          suspendedUntil: user.suspendedUntil || null,
        },
      });
    }

    // Update lastActive
    user.lastActive = new Date();
    await user.save();

    req.user = user;
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        code: "TOKEN_EXPIRED",
        message: "Session expired. Please log in again.",
      });
    }
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        code: "TOKEN_INVALID",
        message: "Invalid token",
      });
    }
    console.error("Auth error:", error.message);
    return res.status(401).json({
      code: "AUTH_ERROR",
      message: "Authentication failed",
    });
  }
};

module.exports = protect;