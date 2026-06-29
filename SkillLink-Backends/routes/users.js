const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Post = require('../models/Post');
const protect = require("../middleware/authMiddleware");
const reviewController = require("../controllers/reviewController");


// ========================================
// GET CURRENT USER (using token)
// ========================================
router.get("/me", async (req, res) => {
  try {
    // The token is already verified by your auth middleware.
    // Assuming you have an auth middleware that sets req.userId or req.user
    // If you don't have an auth middleware yet, you'll need one.
    const user = await User.findById(req.userId).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});
// GET USER PROFILE
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

/*
========================================
UPDATE USER PROFILE
========================================
*/

router.put("/:id", async (req, res) => {
  try {
    const { name, bio, profileImage, skills, location, phone } = req.body;

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // ✅ ONLY update fields that exist in schema
    if (name !== undefined) user.name = name;
    if (bio !== undefined) user.bio = bio;
    if (profileImage !== undefined) user.profileImage = profileImage; // only if you add it
    if (location !== undefined) user.location = location;
    if (phone !== undefined) user.phone = phone;

    if (skills !== undefined) {
      user.skills = Array.isArray(skills)
        ? skills
        : skills.split(",").map((s) => s.trim());
    }

    const updatedUser = await user.save();

    res.json(updatedUser);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});
router.post("/heartbeat", protect, async (req, res) => {
  try {
    req.user.lastActive = new Date();
    await req.user.save();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/:userId/reviews", reviewController.getUserReviews);

module.exports = router;