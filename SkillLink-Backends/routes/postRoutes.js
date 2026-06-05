const express = require("express");
const Post = require("../models/Post");
const User = require("../models/User");
const protect = require("../middleware/authMiddleware");

const router = express.Router();
const jwt = require("jsonwebtoken"); 

/*
========================================
CREATE POST
========================================
*/
router.post("/", async (req, res) => {
  try {
    console.log("📦 POST /posts body:", req.body); 
    // 1. Get token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "No token provided" });
    }
    const token = authHeader.split(" ")[1];

    // 2. Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.id || decoded.userId;
    if (!userId) throw new Error("Invalid token payload");

    // 3. Get user
    const user = await User.findById(userId);
    if (!user) return res.status(401).json({ message: "User not found" });

    // 4. Create post (ignore extra fields like 'price')
    const { skill, description, tags, location, media, price, mediaType } = req.body;
    const post = new Post({
      user: user._id,
      name: user.name,
      skill,
      description,
      price: Number(price),
      tags: tags || [],
      location: location || "",
      media: media || null,
      mediaType: mediaType || "image"
    });

    await post.save();
    res.json(post);
  } catch (error) {
    console.error("❌ POST /posts error:", error);
    if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Invalid or expired token" });
    }
    res.status(500).json({ message: error.message || "Server error" });
  }
});

/*
========================================
GET FEED POSTS (Pagination)
========================================
*/

router.get("/", async (req, res) => {

  try {

    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const totalPosts = await Post.countDocuments();

    const posts = await Post.find()
      .populate("user", "name profileImage email ")
      .sort({ rating: -1, jobsCompleted: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.json({
      success: true,
      hasMore: page * limit < totalPosts,
      posts: posts.map(post => ({
      ...post._doc,
      media: post.media || null,
      mediaType: post.mediaType || "image"
     }))
    });

  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }

});



/*
========================================
SEARCH POSTS BY SKILL
========================================
*/

router.get("/search", async (req, res) => {

  try {

    const { skill } = req.query;

    const posts = await Post.find({
      skill: { $regex: skill, $options: "i" }
    });

    res.json(posts);

  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }

});



/*
========================================
SAVE / UNSAVE POST
========================================
*/

router.put("/save/:id", protect, async (req, res) => {

  try {

    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    const alreadySaved = post.savedBy.includes(req.user.id);

    if (alreadySaved) {

      post.savedBy = post.savedBy.filter(
        (userId) => userId.toString() !== req.user.id
      );

    } else {

      post.savedBy.push(req.user.id);

    }

    await post.save();

    res.json(post);

  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }

});



/*
========================================
GET MY POSTS
========================================
*/

router.get("/myposts", protect, async (req, res) => {

  try {

    const posts = await Post.find({
      user: req.user.id
    }).sort({ createdAt: -1 });

    res.json(posts);

  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }

});

router.get("/user/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const posts = await Post.find({ user: userId }).sort({ createdAt: -1 });
    res.json(posts);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});
module.exports = router;