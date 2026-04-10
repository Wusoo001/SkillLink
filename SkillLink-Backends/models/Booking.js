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

    description: String,

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
      reference: String,
      provider: String,
      escrowHeld: { type: Boolean, default: false },
      paidAt: Date,
      releasedAt: Date,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Booking", bookingSchema);