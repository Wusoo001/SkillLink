const mongoose = require("mongoose");

const recommendationReplySchema = new mongoose.Schema(
  {
    request: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RecommendationRequest",
      required: true,
    },
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
    text: { type: String, required: true, trim: true, maxlength: 500 },
    // Optional linked provider — the moat
    recommendedUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

recommendationReplySchema.index({ request: 1, createdAt: 1 });
recommendationReplySchema.index({ author: 1, createdAt: -1 }); // daily rate limit

module.exports = mongoose.model("RecommendationReply", recommendationReplySchema);