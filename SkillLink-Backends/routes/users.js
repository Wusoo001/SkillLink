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
// DELETE ACCOUNT (Google Play requirement)
// ⚠️ MUST be before /:id route
// ========================================
router.delete("/me", protect, async (req, res) => {
  try {
    const userId = req.user._id;

    console.log(`🗑️  Deleting account: ${userId}`);

    // 1. Delete personal posts
    const posts = await Post.find({ user: userId });
    for (const post of posts) {
      await post.deleteOne();
    }
    console.log(`   ✓ Deleted ${posts.length} posts`);

    // 2. Delete wallet
    await Wallet.deleteOne({ provider: userId });
    console.log(`   ✓ Deleted wallet`);

    // 3. Delete notifications
    await Notification.deleteMany({ user: userId });
    console.log(`   ✓ Deleted notifications`);

    // 4. Delete reviews written by this user
    await Review.deleteMany({ client: userId });
    console.log(`   ✓ Deleted reviews`);

    // 5. Delete reports made by this user
    await Report.deleteMany({ reporter: userId });
    console.log(`   ✓ Deleted reports`);

    // 6. Anonymize bookings (keep for revenue history, detach from user)
    await Booking.updateMany(
      { $or: [{ client: userId }, { provider: userId }] },
      {
        $set: {
          deletedAccount: true,
          clientAnonymized: true,
        },
      }
    );
    console.log(`   ✓ Anonymized bookings`);

    // 7. Finally delete the user
    await req.user.deleteOne();
    console.log(`   ✓ User deleted`);

    res.json({
      success: true,
      message: "Account deleted successfully",
    });
  } catch (error) {
    console.error("Delete account error:", error.message);
    res.status(500).json({ success: false, message: "Failed to delete account" });
  }
});

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