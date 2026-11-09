const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    // Can be a booking chat OR a product chat
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: false, // Changed from true
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: false,
    },
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false, // Needed for product chats
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    text: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    location: {
      lat: { type: Number },
      lng: { type: Number },
      label: { type: String, trim: true, maxlength: 200 },
      type: {
        type: String,
        enum: ["work_location", "in_transit", "arrived"],
      },
    },
    blocked: {
      type: Boolean,
      default: false,
    },
    blockedReason: {
      type: String,
      default: null,
    },
    readAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

messageSchema.index({ booking: 1, createdAt: 1 });
messageSchema.index({ product: 1, sender: 1, recipient: 1, createdAt: 1 });

module.exports = mongoose.model("Message", messageSchema);