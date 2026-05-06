const mongoose = require("mongoose");

const walletSchema = new mongoose.Schema(
  {
    provider: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    balance: {
      type: Number,
      default: 0,
    },

    totalEarned: {
      type: Number,
      default: 0,
    },

    transactions: [
      {
        type: {
          type: String, // "credit" | "debit"
          required: true,
        },
        amount: Number,
        reference: String,
        bookingId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Booking",
        },
        description: String,
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Wallet", walletSchema);