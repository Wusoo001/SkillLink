const mongoose = require("mongoose");

const recommendationRequestSchema = new mongoose.Schema(
  {
    circle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Circle",
      required: true,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    category: { type: String, required: true, trim: true },
    title: { type: String, required: true, trim: true, maxlength: 100 },
    description: {
      type: String,
      default: "",
      trim: true,
      maxlength: 500,
    },
    isResolved: { type: Boolean, default: false },
    replyCount: { type: Number, default: 0 },
    resolvedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

recommendationRequestSchema.index({ circle: 1, isResolved: 1, createdAt: -1 });
recommendationRequestSchema.index({ author: 1 });
recommendationRequestSchema.index({ author: 1, createdAt: -1 }); // daily rate limit

module.exports = mongoose.model("RecommendationRequest", recommendationRequestSchema);