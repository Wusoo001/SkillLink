const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
  {
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    provider: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    serviceTitle: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },
    scheduledDate: {
      type: Date,
      required: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },

    message: {
      type: String,
      default: "",
      trim: true,
    },
    acceptedAt: {
      type: Date,
    },
    expiresAt: {
      type: Date,
    },

    status: {
      type: String,
      enum: [
        "pending_acceptance",
        "accepted",
        "rejected",
        "awaiting_payment",
        "paid_in_escrow",
        "in_progress",
        "completed",
        "ready_for_release",
        "released",
        "cancelled",
        "disputed",
      ],
      default: "pending_acceptance",
    },

    payment: {
      reference: { type: String },
      provider: { type: String, default: "paystack" },
      status: {
        type: String,
        enum: ["pending", "paid", "failed"],
        default: "pending",
      },
      escrowStatus: {
        type: String,
        enum: ["pending", "funded", "released"],
        default: "pending",
      },
      escrowHeld: { type: Boolean, default: false },
      amountPaid: { type: Number },
      paidAt: { type: Date },
      releasedAt: { type: Date },
    },
  },
  { timestamps: true }
);

// ✅ Auto‑set expiry – using async/await (no `next`)
bookingSchema.pre("save", async function () {
  if (this.isNew && this.status === "pending_acceptance") {
    this.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h
  }
});

// Virtual
bookingSchema.virtual("isExpired").get(function () {
  if (this.status !== "pending_acceptance") return false;
  return this.expiresAt && this.expiresAt < new Date();
});

// Ensure virtuals are included in JSON output
bookingSchema.set("toJSON", { virtuals: true });
bookingSchema.set("toObject", { virtuals: true });

// Indexes
bookingSchema.index({ "payment.reference": 1 });
bookingSchema.index({ status: 1, expiresAt: 1 });

module.exports = mongoose.model("Booking", bookingSchema);