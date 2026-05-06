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
    },

    status: {
      type: String,
      enum: [
        "pending",
        "awaiting_payment",
        "paid_in_escrow",
        "in_progress",
        "completed",
        "released",
        "cancelled",
        "disputed",
      ],
      default: "pending",
    },

    payment: {
      reference: {
        type: String,
      },

      provider: {
        type: String,
        default: "paystack",
      },

      status: {
        type: String,
        enum: ["pending", "success", "failed"],
        default: "pending",
      },

      escrowStatus: {
        type: String,
        enum: ["not_funded", "held", "released"],
        default: "not_funded",
      },

      escrowHeld: {
        type: Boolean,
        default: false,
      },

      amountPaid: {
        type: Number,
      },

      paidAt: {
        type: Date,
      },

      releasedAt: {
        type: Date,
      },
    },
  },
  { timestamps: true }
);

// 🔥 index for fast lookup during webhook processing
bookingSchema.index({ "payment.reference": 1 });

module.exports = mongoose.model("Booking", bookingSchema);