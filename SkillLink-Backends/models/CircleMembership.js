const mongoose = require("mongoose");

const circleMembershipSchema = new mongoose.Schema(
  {
    circle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Circle",
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    joinedAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

circleMembershipSchema.index({ circle: 1, user: 1 }, { unique: true });
circleMembershipSchema.index({ user: 1 });

module.exports = mongoose.model("CircleMembership", circleMembershipSchema);