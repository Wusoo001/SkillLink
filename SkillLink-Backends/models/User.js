const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    phone: String,
    password: {
      type: String,
      required: true,
    },

    location: String,
    skills: [String],
    bio: String,

    profileImage: {
    type: String,
    default: "",
    },
     location: {
    type: String,
    default: "",
    },
  
    // NEW: Structured location
    locationDetails: {
    city: { type: String, default: "" },
    state: { type: String, default: "" },
    country: { type: String, default: "Nigeria" },
    // Optional: coordinates for distance-based search
    coordinates: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], default: [0, 0] }, // [longitude, latitude]
    },
    },

    rating: {
      type: Number,
      default: 0,
    },
    jobsCompleted: {
      type: Number,
      default: 0,
    },
    lastActive: {
      type: Date,
      default: Date.now,
    },
    passwordChangedAt: {
      type: Date,
      default: null,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    verificationToken: {
      type: String,
    },
    verificationTokenExpires: {
      type: Date,
    },
    bankDetails: {
      bankName: { type: String },
      bankCode: { type: String }, 
      accountNumber: { type: String }, 
      accountName: { type: String },
      verified: { type: Boolean, default: false },
      createdAt: { type: Date, default: Date.now },
      updatedAt: { type: Date, default: Date.now },
    },

    deleteRequestedAt: {
      type: Date,
      default: null,
    },
    scheduledDeletionAt: {
      type: Date,
      default: null,
    },

    savedPosts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Post",
      },
    ],

        // ADD THESE AFTER isVerified:
    isBanned: {
      type: Boolean,
      default: false,
    },
    bannedAt: {
      type: Date,
      default: null,
    },
    banReason: {
      type: String,
      default: "",
    },
    bannedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    suspendedUntil: {
      type: Date,
      default: null,
    },
    suspendReason: {
      type: String,
      default: "",
    },
    suspendedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    warnings: [
      {
        reason: { type: String, required: true },
        issuedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        issuedAt: { type: Date, default: Date.now },
        reportId: { type: mongoose.Schema.Types.ObjectId, ref: "Report", default: null },
      },
    ],
  },
  { timestamps: true }
);
userSchema.index({ "locationDetails.coordinates": '2dsphere' });
module.exports = mongoose.model("User", userSchema);