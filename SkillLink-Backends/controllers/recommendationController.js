const RecommendationRequest = require("../models/RecommendationRequest");
const RecommendationReply = require("../models/RecommendationReply");
const Circle = require("../models/Circle");
const CircleMembership = require("../models/CircleMembership");
const User = require("../models/User");
const notificationController = require("./notificationController");

const MAX_REQUESTS_PER_DAY = 5;
const MAX_REPLIES_PER_DAY = 20;

// ======================================================
// HELPERS
// ======================================================
const ensureMember = async (circleId, userId) => {
  const membership = await CircleMembership.findOne({
    circle: circleId,
    user: userId,
  }).lean();
  return !!membership;
};

const withinDailyLimit = async (Model, filter, limit) => {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const count = await Model.countDocuments({
    ...filter,
    createdAt: { $gte: oneDayAgo },
  });
  return count < limit;
};

// ======================================================
// CREATE REQUEST — members only, 5/day limit
// POST /api/circles/:circleId/requests
// ======================================================
const createRequest = async (req, res) => {
  try {
    const { circleId } = req.params;
    const { category, title, description } = req.body;

    if (!category || !category.trim()) {
      return res.status(400).json({ success: false, message: "Category is required." });
    }
    if (!title || title.trim().length < 10) {
      return res.status(400).json({
        success: false,
        message: "Title must be at least 10 characters.",
      });
    }

    const circle = await Circle.findById(circleId);
    if (!circle) {
      return res.status(404).json({ success: false, message: "Circle not found" });
    }
    if (circle.status !== "active") {
      return res.status(400).json({
        success: false,
        message: "This circle is not active yet.",
      });
    }

    const isMember = await ensureMember(circle._id, req.user._id);
    if (!isMember) {
      return res.status(403).json({
        success: false,
        message: "Join this circle before posting.",
      });
    }

    const allowed = await withinDailyLimit(
      RecommendationRequest,
      { author: req.user._id },
      MAX_REQUESTS_PER_DAY
    );
    if (!allowed) {
      return res.status(429).json({
        success: false,
        message: `You can post up to ${MAX_REQUESTS_PER_DAY} requests per day. Try again tomorrow.`,
      });
    }

    const request = await RecommendationRequest.create({
      circle: circle._id,
      author: req.user._id,
      category: category.trim(),
      title: title.trim(),
      description: (description || "").trim(),
    });

    circle.requestCount = circle.requestCount + 1;
    await circle.save();

    const populated = await RecommendationRequest.findById(request._id)
      .populate("author", "name profileImage")
      .lean();

    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    console.error("Create request error:", error.message);
    res.status(500).json({ success: false, message: "Failed to create request" });
  }
};

// ======================================================
// LIST REQUESTS — open first, paginated
// GET /api/circles/:circleId/requests?resolved=false|true&page=1&limit=20
// ======================================================
const listRequests = async (req, res) => {
  try {
    const { circleId } = req.params;
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const skip = (page - 1) * limit;
    const showResolved = req.query.resolved === "true";

    const circle = await Circle.findById(circleId).select("status").lean();
    if (!circle) {
      return res.status(404).json({ success: false, message: "Circle not found" });
    }
    if (circle.status !== "active") {
      return res.status(400).json({ success: false, message: "Circle not active." });
    }

    const filter = { circle: circleId, isResolved: showResolved };

    const [requests, total] = await Promise.all([
      RecommendationRequest.find(filter)
        .populate("author", "name profileImage")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      RecommendationRequest.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: requests,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("List requests error:", error.message);
    res.status(500).json({ success: false, message: "Failed to load requests" });
  }
};

// ======================================================
// GET ONE REQUEST + REPLIES
// GET /api/circles/:circleId/requests/:requestId
// ======================================================
const getRequest = async (req, res) => {
  try {
    const { requestId, circleId } = req.params;

    const request = await RecommendationRequest.findOne({
      _id: requestId,
      circle: circleId,
    })
      .populate("author", "name profileImage")
      .lean();

    if (!request) {
      return res.status(404).json({ success: false, message: "Request not found" });
    }

    const replies = await RecommendationReply.find({ request: requestId })
      .populate("author", "name profileImage")
      .populate(
        "recommendedUser",
        "name profileImage rating jobsCompleted isVerified"
      )
      .sort({ createdAt: 1 })
      .lean();

    res.json({ success: true, data: { ...request, replies } });
  } catch (error) {
    console.error("Get request error:", error.message);
    res.status(500).json({ success: false, message: "Failed to load request" });
  }
};

// ======================================================
// TOGGLE RESOLVED — author only
// PATCH /api/circles/:circleId/requests/:requestId/resolve
// ======================================================
const resolveRequest = async (req, res) => {
  try {
    const { requestId } = req.params;

    const request = await RecommendationRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({ success: false, message: "Request not found" });
    }
    if (String(request.author) !== String(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: "Only the author can resolve this request.",
      });
    }

    request.isResolved = !request.isResolved;
    request.resolvedAt = request.isResolved ? new Date() : null;
    await request.save();

    res.json({ success: true, data: request });
  } catch (error) {
    console.error("Resolve request error:", error.message);
    res.status(500).json({ success: false, message: "Failed to update request" });
  }
};

// ======================================================
// DELETE REQUEST — author only, cascade delete replies
// DELETE /api/circles/:circleId/requests/:requestId
// ======================================================
const deleteRequest = async (req, res) => {
  try {
    const { requestId } = req.params;

    const request = await RecommendationRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({ success: false, message: "Request not found" });
    }
    if (String(request.author) !== String(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: "Only the author can delete this request.",
      });
    }

    await RecommendationReply.deleteMany({ request: request._id });
    await request.deleteOne();

    await Circle.findByIdAndUpdate(request.circle, {
      $inc: { requestCount: -1 },
    });

    res.json({ success: true, message: "Request deleted" });
  } catch (error) {
    console.error("Delete request error:", error.message);
    res.status(500).json({ success: false, message: "Failed to delete request" });
  }
};

// ======================================================
// CREATE REPLY — members only, 20/day, optional recommendedUser
// POST /api/circles/:circleId/requests/:requestId/replies
// ======================================================
const createReply = async (req, res) => {
  try {
    const { requestId, circleId } = req.params;
    const { text, recommendedUserId } = req.body;

    if (!text || text.trim().length < 5) {
      return res.status(400).json({
        success: false,
        message: "Reply must be at least 5 characters.",
      });
    }

    const request = await RecommendationRequest.findById(requestId).populate(
      "author",
      "name"
    );
    if (!request) {
      return res.status(404).json({ success: false, message: "Request not found" });
    }
    if (String(request.circle) !== String(circleId)) {
      return res.status(400).json({ success: false, message: "Circle mismatch" });
    }
    if (request.isResolved) {
      return res.status(400).json({
        success: false,
        message: "This request is resolved. You can no longer reply.",
      });
    }
    if (String(request.author._id) === String(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: "You cannot reply to your own request.",
      });
    }

    const isMember = await ensureMember(request.circle, req.user._id);
    if (!isMember) {
      return res.status(403).json({
        success: false,
        message: "Join this circle before replying.",
      });
    }

    let recommendedUser = null;
    if (recommendedUserId) {
      if (String(recommendedUserId) === String(req.user._id)) {
        return res.status(400).json({
          success: false,
          message: "You cannot recommend yourself.",
        });
      }
      recommendedUser = await User.findById(recommendedUserId).select("_id").lean();
      if (!recommendedUser) {
        return res.status(400).json({
          success: false,
          message: "The recommended provider could not be found.",
        });
      }
    }

    const allowed = await withinDailyLimit(
      RecommendationReply,
      { author: req.user._id },
      MAX_REPLIES_PER_DAY
    );
    if (!allowed) {
      return res.status(429).json({
        success: false,
        message: `You can post up to ${MAX_REPLIES_PER_DAY} replies per day. Try again tomorrow.`,
      });
    }

    const reply = await RecommendationReply.create({
      request: request._id,
      circle: request.circle,
      author: req.user._id,
      text: text.trim(),
      recommendedUser: recommendedUser?._id || null,
    });

    request.replyCount = request.replyCount + 1;
    await request.save();

    // Notify request author (best effort — never blocks the reply)
    try {
      const senderName = req.user?.name || "Someone";
      const trimmed = text.trim();
      const preview = trimmed.length > 60 ? trimmed.substring(0, 60) + "…" : trimmed;

      await notificationController.createNotification(
        request.author._id,
        "circle_reply",
        `New recommendation from ${senderName}`,
        preview,
        {
          extra: {
            circleId: String(request.circle),
            requestId: String(request._id),
            replyId: String(reply._id),
          },
        }
      );
    } catch (notifError) {
      console.error("Reply notification error:", notifError.message);
    }

    const populated = await RecommendationReply.findById(reply._id)
      .populate("author", "name profileImage")
      .populate(
        "recommendedUser",
        "name profileImage rating jobsCompleted isVerified"
      )
      .lean();

    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    console.error("Create reply error:", error.message);
    res.status(500).json({ success: false, message: "Failed to create reply" });
  }
};

// ======================================================
// DELETE REPLY — author only
// DELETE /api/circles/:circleId/requests/:requestId/replies/:replyId
// ======================================================
const deleteReply = async (req, res) => {
  try {
    const { replyId, requestId } = req.params;

    const reply = await RecommendationReply.findOne({
      _id: replyId,
      request: requestId,
    });
    if (!reply) {
      return res.status(404).json({ success: false, message: "Reply not found" });
    }
    if (String(reply.author) !== String(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: "Only the author can delete this reply.",
      });
    }

    await reply.deleteOne();

    await RecommendationRequest.findByIdAndUpdate(reply.request, {
      $inc: { replyCount: -1 },
    });

    res.json({ success: true, message: "Reply deleted" });
  } catch (error) {
    console.error("Delete reply error:", error.message);
    res.status(500).json({ success: false, message: "Failed to delete reply" });
  }
};

module.exports = {
  createRequest,
  listRequests,
  getRequest,
  resolveRequest,
  deleteRequest,
  createReply,
  deleteReply,
};