const mongoose = require("mongoose");

const reportSchema = new mongoose.Schema(
  {
    reporter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // Who or what is being reported
    reportedUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    reportedPost: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
    },
    // What kind of report
    type: {
      type: String,
      enum: ["user", "post"],
      required: true,
    },
    reason: {
      type: String,
      enum: [
        "spam",
        "harassment",
        "fake_account",
        "inappropriate_content",
        "scam",
        "off_platform_deal",
        "other",
      ],
      required: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: "",
    },
    status: {
      type: String,
      enum: ["pending", "reviewed", "dismissed", "actioned"],
      default: "pending",
    },
  },
  { timestamps: true }
);

reportSchema.index({ status: 1, createdAt: -1 });
reportSchema.index({ reportedUser: 1 });
reportSchema.index({ reportedPost: 1 });

module.exports = mongoose.model("Report", reportSchema);