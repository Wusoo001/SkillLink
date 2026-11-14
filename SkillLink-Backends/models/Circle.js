const mongoose = require("mongoose");

const circleSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    lga: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ["active", "coming_soon"],
      default: "coming_soon",
      index: true,
    },
    memberCount: { type: Number, default: 0 },
    requestCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// One circle per LGA per state
circleSchema.index({ state: 1, lga: 1 }, { unique: true });
circleSchema.index({ status: 1, state: 1 });

module.exports = mongoose.model("Circle", circleSchema);