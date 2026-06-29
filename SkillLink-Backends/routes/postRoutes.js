const express = require("express");
const Post = require("../models/Post");
const User = require("../models/User");
const protect = require("../middleware/authMiddleware");
const Review = require("../models/Review");

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
/*
========================================
GET FEED POSTS (Pagination) + Reviews
========================================
*/
router.get("/", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const totalPosts = await Post.countDocuments();

    // 1. Fetch posts with user data
    const posts = await Post.find()
      .populate("user", "name profileImage email lastActive rating jobsCompleted")
      .sort({ rating: -1, jobsCompleted: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    // 2. Get all unique provider IDs from the posts
    const providerIds = [...new Set(posts.map(p => p.user?._id).filter(Boolean))];

    // 3. Fetch latest 3 reviews for each provider
    let reviewsMap = {};
    if (providerIds.length > 0) {
      // Use aggregation to get the latest 3 reviews per provider
      const reviewGroups = await Review.aggregate([
        { $match: { provider: { $in: providerIds } } },
        { $sort: { createdAt: -1 } },
        {
          $group: {
            _id: "$provider",
            reviews: { $push: "$$ROOT" },
          },
        },
        {
          $project: {
            _id: 1,
            reviews: { $slice: ["$reviews", 3] }, // Only keep the latest 3
          },
        },
      ]);

      // 4. Populate client details for each review
      const allReviews = reviewGroups.flatMap(g => g.reviews);
      if (allReviews.length > 0) {
        await Review.populate(allReviews, { path: "client", select: "name profileImage" });
      }

      // 5. Build a map: providerId -> array of reviews
      reviewsMap = {};
      reviewGroups.forEach(group => {
        reviewsMap[group._id.toString()] = group.reviews.map(r => ({
          _id: r._id,
          rating: r.rating,
          comment: r.comment,
          client: r.client ? { name: r.client.name, profileImage: r.client.profileImage } : null,
          createdAt: r.createdAt,
        }));
      });
    }

    // 6. Attach reviews to each pos
    const reviewCounts = await Review.aggregate([
      { $match: { provider: { $in: providerIds } } },
      { $group: { _id: "$provider", count: { $sum: 1 } } },
    ]);

    const countMap = {};
      reviewCounts.forEach((item) => {
      countMap[item._id.toString()] = item.count;
    });

    const postsWithReviews = posts.map(post => ({
      ...post._doc,
      media: post.media || null,
      mediaType: post.mediaType || "image",
      reviews: reviewsMap[post.user?._id?.toString()] || [],
      reviewCount: countMap[post.user?._id?.toString()] || 0, // ← ADD THIS
    }));


    res.json({
      success: true,
      hasMore: page * limit < totalPosts,
      posts: postsWithReviews,
    });
  } catch (error) {
    console.error("❌ GET /posts error:", error);
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

/*
========================================
GET POSTS BY USER
========================================
*/
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

/*
========================================
LIKE / UNLIKE POST
========================================
*/
router.post('/:id/like', protect, async (req, res) => {
  const post = await Post.findById(req.params.id);
  if (!post) return res.status(404).json({ message: 'Post not found' });
  if (post.likes.includes(req.user.id)) {
    return res.status(400).json({ message: 'Already liked' });
  }
  post.likes.push(req.user.id);
  post.likesCount = post.likes.length;
  await post.save();
  res.json({ message: 'Liked', likesCount: post.likesCount });
});

router.delete('/:id/like', protect, async (req, res) => {
  const post = await Post.findById(req.params.id);
  if (!post) return res.status(404).json({ message: 'Post not found' });
  post.likes = post.likes.filter(id => id.toString() !== req.user.id);
  post.likesCount = post.likes.length;
  await post.save();
  res.json({ message: 'Unliked', likesCount: post.likesCount });
});

/*
========================================
EDIT POST (PUT /:id)
========================================
*/
router.put("/:id", protect, async (req, res) => {
  console.log("🔵 PUT /posts/:id received:", req.params.id);
  console.log("📦 Request body:", req.body);
  try {
    const postId = req.params.id;
    const userId = req.user.id;

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    // Check ownership
    if (post.user.toString() !== userId) {
      return res.status(403).json({ message: "Unauthorized to edit this post" });
    }

    // Allowed fields to update
    const { skill, description, price, tags, location, media, mediaType } = req.body;

    if (skill !== undefined) post.skill = skill;
    if (description !== undefined) post.description = description;
    if (price !== undefined) post.price = Number(price);
    if (tags !== undefined) post.tags = tags || [];
    if (location !== undefined) post.location = location || "";
    if (media !== undefined) post.media = media || null;
    if (mediaType !== undefined) post.mediaType = mediaType || "image";

    await post.save();

    res.json({ success: true, post });
  } catch (error) {
    console.error("❌ PUT /posts/:id error:", error);
    res.status(500).json({ message: error.message || "Server error" });
  }
});

/*
========================================
DELETE POST (DELETE /:id)
========================================
*/
router.delete("/:id", protect, async (req, res) => {
  console.log("🔴 DELETE /posts/:id received:", req.params.id);
  try {
    const postId = req.params.id;
    const userId = req.user.id;

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    // Check ownership
    if (post.user.toString() !== userId) {
      return res.status(403).json({ message: "Unauthorized to delete this post" });
    }

    await post.deleteOne();

    res.json({ success: true, message: "Post deleted successfully" });
  } catch (error) {
    console.error("❌ DELETE /posts/:id error:", error);
    res.status(500).json({ message: error.message || "Server error" });
  }
});

module.exports = router;