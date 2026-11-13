const mongoose = require("mongoose");

const adminAuditLogSchema = new mongoose.Schema(
  {
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    actorEmail: {
      type: String,
      required: true,
    },
    action: {
      type: String,
      required: true,
      index: true,
      enum: [
        "verify_user",
        "unverify_user",
        "delete_user",
        "delete_post",
        "delete_review",
        "warn_user",
        "suspend_user",
        "ban_user",
        "unban_user",
        "unsuspend_user",
        "dismiss_report",
        "action_report",
        "resolve_appeal",
      ],
    },
    targetType: {
      type: String,
      required: true,
      enum: ["user", "post", "review", "report", "appeal"],
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    targetLabel: {
      type: String,
      default: "",
    },
    reason: {
      type: String,
      default: "",
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    ip: {
      type: String,
      default: "",
    },
    userAgent: {
      type: String,
      default: "",
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

adminAuditLogSchema.index({ createdAt: -1 });
adminAuditLogSchema.index({ action: 1, createdAt: -1 });

module.exports = mongoose.model("AdminAuditLog", adminAuditLogSchema);