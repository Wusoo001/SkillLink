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
      min:0,
      default:0,
    },
    status: {
      type: String,
      enum: [
        "pending",
        "awaiting_payment",
        "paid_in_escrow",
        "in_progress",
        "completed",
        "ready_for_release",
        "released",
        "cancelled",
        "disputed",
      ],
      default: "pending",
    },
    payment: {
      reference: { type: String },
      provider: { type: String, default: "paystack" },
      status: {
        type: String,
        enum: ["pending", "paid", "failed"],   // ✅ fixed
        default: "pending",
      },
      escrowStatus: {
        type: String,
        enum: ["pending", "funded", "released"], // ✅ matches your code
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

// index for fast lookup during webhook processing
bookingSchema.index({ "payment.reference": 1 });

module.exports = mongoose.model("Booking", bookingSchema);