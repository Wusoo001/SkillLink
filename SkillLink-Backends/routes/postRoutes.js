const express = require("express");
const Post = require("../models/Post");
const User = require("../models/User");
const protect = require("../middleware/authMiddleware");

const router = express.Router();



/*
========================================
CREATE POST
========================================
*/

router.post("/", protect, async (req, res) => {

  try {

    const { skill, description, tags, location } = req.body;

    const user = await User.findById(req.user.id);

    const post = new Post({
      user: user._id,
      name: user.name,
      skill,
      description,
      tags,
      location
    });

    await post.save();

    res.json(post);

  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server error" });
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

    const posts = await Post.find()
      .populate("user", "name email")
      .sort({ rating: -1, jobsCompleted: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.json({
      success: true,
      posts: posts
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