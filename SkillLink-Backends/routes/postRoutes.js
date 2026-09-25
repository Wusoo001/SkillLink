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
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "No token provided" });
    }
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.id || decoded.userId;
    if (!userId) throw new Error("Invalid token payload");

    const user = await User.findById(userId);
    if (!user) return res.status(401).json({ message: "User not found" });

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

// GET / – newest first, per‑post reviews
router.get("/", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const totalPosts = await Post.countDocuments();

    const posts = await Post.find()
      .populate("user", "name profileImage email lastActive rating jobsCompleted")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const postIds = posts.map(p => p._id);
    let reviewsMap = {};
    let countMap = {};

    if (postIds.length > 0) {
      // Single aggregation to get total count AND latest 3 reviews per post
      const reviewData = await Review.aggregate([
        { $match: { post: { $in: postIds } } },
        { $sort: { createdAt: -1 } },
        {
          $group: {
            _id: "$post",
            totalCount: { $sum: 1 },
            reviews: { $push: "$$ROOT" },
          },
        },
        {
          $project: {
            totalCount: 1,
            reviews: { $slice: ["$reviews", 3] }, // only keep the 3 most recent
          },
        },
      ]);

      // Populate client details for all reviews
      const allReviews = reviewData.flatMap(g => g.reviews);
      if (allReviews.length > 0) {
        await Review.populate(allReviews, { path: "client", select: "name profileImage" });
      }

      // Build the maps
      reviewData.forEach(group => {
        const postId = group._id.toString();
        countMap[postId] = group.totalCount;
        reviewsMap[postId] = group.reviews.map(r => ({
          _id: r._id,
          rating: r.rating,
          comment: r.comment,
          client: r.client ? { name: r.client.name, profileImage: r.client.profileImage } : null,
          createdAt: r.createdAt,
        }));
      });
    }

    const postsWithReviews = posts.map(post => ({
      ...post._doc,
      media: post.media || null,
      mediaType: post.mediaType || "image",
      reviews: reviewsMap[post._id.toString()] || [],
      reviewCount: countMap[post._id.toString()] || 0,
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
// ================================================
// SEARCH POSTS (name + skill + description + city + state)
// ================================================
router.get("/search", async (req, res) => {
  try {
    const { q, city, state, country, minPrice, maxPrice } = req.query;

    let filter = {};
    let nameMatchedUserIds = [];

    // 1. If there's a text query, find users whose NAME matches
    if (q && q.trim().length > 0) {
      const nameRegex = { $regex: q.trim(), $options: "i" };
      const matchingUsers = await User.find({ name: nameRegex }).select("_id");
      nameMatchedUserIds = matchingUsers.map((u) => u._id);
    }

    // 2. Build text search $or conditions (Post fields + matched users)
    if (q && q.trim().length > 0) {
      const searchRegex = { $regex: q.trim(), $options: "i" };
      filter.$or = [
        { skill: searchRegex },
        { description: searchRegex },
        { tags: { $in: [new RegExp(q.trim(), "i")] } },
        { location: searchRegex },
        { locationCity: searchRegex },
        { locationState: searchRegex },
        // ✅ Posts created by users whose name matches
        ...(nameMatchedUserIds.length > 0
          ? [{ user: { $in: nameMatchedUserIds } }]
          : []),
      ];
    }

    // 3. City filter
    if (city && city.trim().length > 0) {
      const cityRegex = { $regex: city.trim(), $options: "i" };
      const cityOr = [
        { locationCity: cityRegex },
        { location: cityRegex },
      ];

      if (filter.$or) {
        // Combine existing text $or with city $or using $and
        filter = {
          $and: [{ $or: filter.$or }, { $or: cityOr }],
        };
      } else {
        filter.$or = cityOr;
      }
    }

    // 4. State filter
    if (state && state.trim().length > 0) {
      filter.locationState = { $regex: state.trim(), $options: "i" };
    }

    // 5. Country filter
    if (country && country.trim().length > 0) {
      filter.locationCountry = { $regex: country.trim(), $options: "i" };
    }

    // 6. Price range
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = parseFloat(minPrice);
      if (maxPrice) filter.price.$lte = parseFloat(maxPrice);
    }

    const posts = await Post.find(filter)
      .populate(
        "user",
        "name profileImage email lastActive rating jobsCompleted isVerified"
      )
      .sort({ createdAt: -1 });

    console.log(
      `🔍 Search: q="${q || ""}" city="${city || ""}" → ${posts.length} results` +
        (nameMatchedUserIds.length > 0
          ? ` (${nameMatchedUserIds.length} users matched name)`
          : "")
    );

    res.json(posts);
  } catch (error) {
    console.error("Search error:", error);
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