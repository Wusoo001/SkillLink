const mongoose = require("mongoose");

// Add N working days (skips weekends only)
const addWorkingDays = (date, days) => {
  const result = new Date(date);
  let added = 0;
  while (added < days) {
    result.setDate(result.getDate() + 1);
    const dow = result.getDay();
    if (dow !== 0 && dow !== 6) added++;
  }
  return result;
};

const appealSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ["ban", "suspension"],
      required: true,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected"],
      default: "pending",
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
    dueBy: {
      type: Date,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    adminNote: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

appealSchema.index({ user: 1, status: 1, submittedAt: -1 });
appealSchema.index({ status: 1, submittedAt: -1 });

appealSchema.pre("save", async function () {
  if (this.isNew && !this.dueBy) {
    this.dueBy = addWorkingDays(this.submittedAt, 10);
  }
});

module.exports = mongoose.model("Appeal", appealSchema);