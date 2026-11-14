const Circle = require("../models/Circle");
const CircleMembership = require("../models/CircleMembership");

// ======================================================
// LIST CIRCLES — only active circles shown to users
// GET /api/circles
// ======================================================
const listCircles = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const skip = (page - 1) * limit;

    const filter = { status: "active" };
    const [circles, total] = await Promise.all([
      Circle.find(filter).sort({ state: 1, name: 1 }).skip(skip).limit(limit).lean(),
      Circle.countDocuments(filter),
    ]);

    let memberIds = [];
    const userCity = (req.user?.locationDetails?.city || "").toLowerCase().trim();
    const userState = (req.user?.locationDetails?.state || "").toLowerCase().trim();

    if (req.user && circles.length > 0) {
      const memberships = await CircleMembership.find({
        user: req.user._id,
        circle: { $in: circles.map((c) => c._id) },
      })
        .select("circle")
        .lean();
      memberIds = memberships.map((m) => String(m.circle));
    }

    const data = circles.map((c) => {
      const circleLga = (c.lga || "").toLowerCase().trim();
      const circleState = (c.state || "").toLowerCase().trim();
      return {
        _id: c._id,
        name: c.name,
        state: c.state,
        lga: c.lga,
        status: c.status,
        memberCount: c.memberCount,
        requestCount: c.requestCount,
        isMember: memberIds.includes(String(c._id)),
        isUsersLga:
          !!userCity &&
          !!userState &&
          circleLga === userCity &&
          circleState === userState,
      };
    });

    res.json({
      success: true,
      data,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("List circles error:", error.message);
    res.status(500).json({ success: false, message: "Failed to load circles" });
  }
};

// ======================================================
// GET MY CIRCLE — matches user's profile LGA
// GET /api/circles/mine
// ======================================================
const getMyCircle = async (req, res) => {
  try {
    const userCity = (req.user?.locationDetails?.city || "").trim();
    const userState = (req.user?.locationDetails?.state || "").trim();

    if (!userCity || !userState) {
      return res.json({
        success: true,
        data: null,
        message: "Set your LGA and state in your profile to see your circle.",
      });
    }

    const circle = await Circle.findOne({
      lga: { $regex: `^${userCity}$`, $options: "i" },
      state: { $regex: `^${userState}$`, $options: "i" },
    }).lean();

    if (!circle) {
      return res.json({
        success: true,
        data: null,
        message: "Your circle is coming soon.",
      });
    }

    const membership = await CircleMembership.findOne({
      circle: circle._id,
      user: req.user._id,
    }).lean();

    res.json({
      success: true,
      data: {
        _id: circle._id,
        name: circle.name,
        state: circle.state,
        lga: circle.lga,
        status: circle.status,
        memberCount: circle.memberCount,
        requestCount: circle.requestCount,
        isMember: !!membership,
        isUsersLga: true,
      },
    });
  } catch (error) {
    console.error("Get my circle error:", error.message);
    res.status(500).json({ success: false, message: "Failed to load your circle" });
  }
};

// ======================================================
// GET ONE CIRCLE
// GET /api/circles/:id
// ======================================================
const getCircle = async (req, res) => {
  try {
    const circle = await Circle.findById(req.params.id).lean();
    if (!circle) {
      return res.status(404).json({ success: false, message: "Circle not found" });
    }

    let isMember = false;
    if (req.user) {
      const membership = await CircleMembership.findOne({
        circle: circle._id,
        user: req.user._id,
      }).lean();
      isMember = !!membership;
    }

    res.json({ success: true, data: { ...circle, isMember } });
  } catch (error) {
    console.error("Get circle error:", error.message);
    res.status(500).json({ success: false, message: "Failed to load circle" });
  }
};

// ======================================================
// JOIN CIRCLE — idempotent
// POST /api/circles/:id/join
// ======================================================
const joinCircle = async (req, res) => {
  try {
    const circle = await Circle.findById(req.params.id);
    if (!circle) {
      return res.status(404).json({ success: false, message: "Circle not found" });
    }
    if (circle.status !== "active") {
      return res.status(400).json({
        success: false,
        message: "This circle is not active yet.",
      });
    }

    const existing = await CircleMembership.findOne({
      circle: circle._id,
      user: req.user._id,
    });
    if (existing) {
      return res.json({
        success: true,
        message: "You are already a member.",
        data: { isMember: true, memberCount: circle.memberCount },
      });
    }

    await CircleMembership.create({ circle: circle._id, user: req.user._id });

    circle.memberCount = circle.memberCount + 1;
    await circle.save();

    res.json({
      success: true,
      message: "Joined circle.",
      data: { isMember: true, memberCount: circle.memberCount },
    });
  } catch (error) {
    console.error("Join circle error:", error.message);
    res.status(500).json({ success: false, message: "Failed to join circle" });
  }
};

// ======================================================
// LEAVE CIRCLE — idempotent
// POST /api/circles/:id/leave
// ======================================================
const leaveCircle = async (req, res) => {
  try {
    const circle = await Circle.findById(req.params.id);
    if (!circle) {
      return res.status(404).json({ success: false, message: "Circle not found" });
    }

    const result = await CircleMembership.deleteOne({
      circle: circle._id,
      user: req.user._id,
    });

    if (result.deletedCount === 0) {
      return res.json({
        success: true,
        message: "You are not a member.",
        data: { isMember: false, memberCount: circle.memberCount },
      });
    }

    circle.memberCount = Math.max(0, circle.memberCount - 1);
    await circle.save();

    res.json({
      success: true,
      message: "Left circle.",
      data: { isMember: false, memberCount: circle.memberCount },
    });
  } catch (error) {
    console.error("Leave circle error:", error.message);
    res.status(500).json({ success: false, message: "Failed to leave circle" });
  }
};

module.exports = {
  listCircles,
  getMyCircle,
  getCircle,
  joinCircle,
  leaveCircle,
};