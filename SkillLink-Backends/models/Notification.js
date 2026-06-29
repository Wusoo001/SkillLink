const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: ["booking_request", "booking_accepted", "booking_rejected", "booking_cancelled", "payment_received", "funds_released"],
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    data: {
      bookingId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Booking",
      },
      clientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      providerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      // Additional metadata
      extra: {
        type: mongoose.Schema.Types.Mixed,
        default: {},
      },
    },
    read: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Index for faster queries
notificationSchema.index({ user: 1, read: 1, createdAt: -1 });
notificationSchema.index({ "data.bookingId": 1 });

module.exports = mongoose.model("Notification", notificationSchema);