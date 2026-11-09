const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    category: {
      type: String,
      trim: true,
      default: "Other",
    },
    images: {
      type: [String],   // Cloudinary URLs
      validate: {
        validator: (arr) => arr.length <= 3,
        message: "Maximum 3 images allowed",
      },
      default: [],
    },
    location: { type: String, default: "" },
    locationCity: { type: String, default: "" },
    locationState: { type: String, default: "" },
    locationCountry: { type: String, default: "Nigeria" },
    isActive: { type: Boolean, default: true },
    isSold: { type: Boolean, default: false },
    views: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Text search index for title + description + category
productSchema.index({ title: "text", description: "text", category: "text" });
productSchema.index({ user: 1, createdAt: -1 });
productSchema.index({ isActive: 1, isSold: 1, createdAt: -1 });

module.exports = mongoose.model("Product", productSchema);