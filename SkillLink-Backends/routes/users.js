const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Post = require('../models/Post');
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
    const { name, bio, image, skills, location, phone } = req.body;

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // ✅ ONLY update fields that exist in schema
    if (name !== undefined) user.name = name;
    if (bio !== undefined) user.bio = bio;
    if (image !== undefined) user.image = image; // only if you add it
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

module.exports = router;