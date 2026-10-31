/**
 * Admin-only middleware — must be used AFTER protect.
 * Checks that the authenticated user's email matches ADMIN_EMAIL.
 */
const adminOnly = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: "Not authorized" });
  }

  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) {
    console.error("❌ ADMIN_EMAIL is not set in .env");
    return res.status(500).json({ success: false, message: "Server misconfiguration" });
  }

  if (req.user.email !== adminEmail) {
    return res.status(403).json({ success: false, message: "Admin access required" });
  }

  next();
};

module.exports = adminOnly;