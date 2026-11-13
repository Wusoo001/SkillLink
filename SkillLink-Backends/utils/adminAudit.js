const AdminAuditLog = require("../models/AdminAuditLog");

/**
 * Log a destructive admin action. Never throws — a failed log write must never
 * block the actual admin action from succeeding.
 */
const logAdminAction = async ({
  req,
  action,
  targetType,
  targetId,
  targetLabel = "",
  reason = "",
  metadata = {},
}) => {
  try {
    if (!req?.user?._id) {
      console.error("Audit log: no authenticated actor");
      return;
    }
    await AdminAuditLog.create({
      actor: req.user._id,
      actorEmail: req.user.email,
      action,
      targetType,
      targetId,
      targetLabel,
      reason,
      metadata,
      ip: req.ip || "",
      userAgent: req.get("user-agent") || "",
    });
  } catch (err) {
    console.error("Audit log error:", err.message);
  }
};

module.exports = { logAdminAction };