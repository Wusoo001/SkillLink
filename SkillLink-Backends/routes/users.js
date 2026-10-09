const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Post = require("../models/Post");
const Wallet = require("../models/Wallet");
const Booking = require("../models/Booking");
const Notification = require("../models/Notification");
const Review = require("../models/Review");
const Report = require("../models/Report");
const protect = require("../middleware/authMiddleware");
const reviewController = require("../controllers/reviewController");

// At the very top of routes/users.js, after imports
const cleanupExpiredDeletions = async () => {
  try {
    const now = new Date();
    const expired = await User.find({
      scheduledDeletionAt: { $lte: now, $ne: null },
    });

    for (const user of expired) {
      await permanentlyDeleteUser(user._id);
    }

    if (expired.length > 0) {
      console.log(`🧹 Cleaned up ${expired.length} expired deletion(s)`);
    }
  } catch (error) {
    console.error("Cleanup error:", error.message);
  }
};

// Run cleanup 10 seconds after server starts
setTimeout(cleanupExpiredDeletions, 10000);

// ========================================
// GET CURRENT USER (using token)
// ========================================
router.get("/me", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// ========================================
// ========================================
// REQUEST ACCOUNT DELETION (with 7-day grace period)
// ⚠️ MUST be before /:id route
// ========================================
router.post("/request-delete", protect, async (req, res) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        success: false,
        message: "Password is required to delete your account",
      });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Verify password
    const bcrypt = require("bcryptjs");
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Incorrect password. Account deletion cancelled.",
      });
    }

    // Schedule deletion for 7 days from now
    const deleteDate = new Date();
    deleteDate.setDate(deleteDate.getDate() + 7);

    user.deleteRequestedAt = new Date();
    user.scheduledDeletionAt = deleteDate;
    await user.save();

    console.log(`🗑️  Deletion scheduled for ${user.email} at ${deleteDate}`);

    res.json({
      success: true,
      message:
        "Account scheduled for deletion. You have 7 days to log back in and cancel.",
      scheduledDeletionAt: deleteDate,
    });
  } catch (error) {
    console.error("Request delete error:", error.message);
    res.status(500).json({ success: false, message: "Failed to schedule deletion" });
  }
});

// ========================================
// CANCEL SCHEDULED DELETION
// ========================================
router.post("/cancel-delete", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    user.deleteRequestedAt = null;
    user.scheduledDeletionAt = null;
    await user.save();

    console.log(`✅ Deletion cancelled for ${user.email}`);

    res.json({
      success: true,
      message: "Account deletion cancelled. Welcome back!",
    });
  } catch (error) {
    console.error("Cancel delete error:", error.message);
    res.status(500).json({ success: false, message: "Failed to cancel deletion" });
  }
});

// ========================================
// INTERNAL HELPER — Permanently delete a user
// ========================================
const permanentlyDeleteUser = async (userId) => {
  try {
    console.log(`🗑️  Permanently deleting user: ${userId}`);

    // 1. Delete personal posts
    const posts = await Post.find({ user: userId });
    for (const post of posts) {
      await post.deleteOne();
    }

    // 2. Delete wallet
    await Wallet.deleteOne({ provider: userId });

    // 3. Delete notifications
    await Notification.deleteMany({ user: userId });

    // 4. Delete reviews written by this user
    await Review.deleteMany({ client: userId });

    // 5. Delete reports made by this user
    await Report.deleteMany({ reporter: userId });

    // 6. Anonymize bookings
    await Booking.updateMany(
      { $or: [{ client: userId }, { provider: userId }] },
      { $set: { deletedAccount: true, clientAnonymized: true } }
    );

    // 7. Delete the user
    await User.findByIdAndDelete(userId);

    console.log(`✅ User permanently deleted: ${userId}`);
  } catch (error) {
    console.error("Permanent delete error:", error.message);
  }
};

// ========================================
// GET USER PROFILE
// ========================================
router.get("/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// ========================================
// UPDATE USER PROFILE
// ========================================
router.put("/:id", async (req, res) => {
  try {
    const { name, bio, profileImage, skills, locationDetails, location, phone } = req.body;

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Only update fields that exist in schema
    if (name !== undefined) user.name = name;
    if (bio !== undefined) user.bio = bio;
    if (profileImage !== undefined) user.profileImage = profileImage;
    if (location !== undefined) user.location = location;
    if (phone !== undefined) user.phone = phone;

    if (skills !== undefined) {
      user.skills = Array.isArray(skills)
        ? skills
        : skills.split(",").map((s) => s.trim());
    }

    if (locationDetails) {
      user.locationDetails = {
        city: locationDetails.city || user.locationDetails?.city || "",
        state: locationDetails.state || user.locationDetails?.state || "",
        country: locationDetails.country || user.locationDetails?.country || "Nigeria",
      };
    }

    const updatedUser = await user.save();
    res.json(updatedUser);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// ========================================
// HEARTBEAT
// ========================================
router.post("/heartbeat", protect, async (req, res) => {
  try {
    req.user.lastActive = new Date();
    await req.user.save();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ========================================
// GET USER REVIEWS
// ========================================
router.get("/:userId/reviews", reviewController.getUserReviews);

module.exports = router;