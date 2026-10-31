const bcrypt = require("bcryptjs");
const User = require("../models/User");
const Appeal = require("../models/Appeal");
const notificationController = require("./notificationController");

const REAPPEAL_COOLDOWN_DAYS = 30;

// ======================================================
// PUBLIC — unauthenticated, credentials-based
// ======================================================

const submitAppeal = async (req, res) => {
  try {
    const { email, password, reason } = req.body;

    if (!email || !password || !reason || reason.trim().length < 20) {
      return res.status(400).json({
        success: false,
        message: "Email, password, and a reason (min 20 chars) are required.",
      });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(401).json({ success: false, message: "Invalid credentials." });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Invalid credentials." });
    }

    const isBanned = user.isBanned === true;
    const isSuspended =
      user.suspendedUntil && new Date(user.suspendedUntil) > new Date();

    if (!isBanned && !isSuspended) {
      return res.status(400).json({
        success: false,
        message: "Your account is not currently restricted.",
      });
    }

    // Check pending appeal
    const pending = await Appeal.findOne({ user: user._id, status: "pending" });
    if (pending) {
      return res.status(400).json({
        success: false,
        message: "You already have a pending appeal. Please wait for a decision.",
      });
    }

    // Check cooldown since last rejection
    const lastRejected = await Appeal.findOne({
      user: user._id,
      status: "rejected",
    }).sort({ resolvedAt: -1 });

    if (lastRejected && lastRejected.resolvedAt) {
      const daysSince = Math.floor(
        (Date.now() - new Date(lastRejected.resolvedAt).getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysSince < REAPPEAL_COOLDOWN_DAYS) {
        return res.status(400).json({
          success: false,
          message: `You can re-appeal in ${REAPPEAL_COOLDOWN_DAYS - daysSince} day(s).`,
        });
      }
    }

    const appeal = await Appeal.create({
      user: user._id,
      email: user.email,
      type: isBanned ? "ban" : "suspension",
      reason: reason.trim(),
    });

    console.log(`📬 Appeal submitted: ${user.email} (${appeal.type})`);

    res.status(201).json({
      success: true,
      message: "Appeal submitted. You'll receive a response within 10 working days.",
      data: {
        _id: appeal._id,
        type: appeal.type,
        status: appeal.status,
        reason: appeal.reason,
        submittedAt: appeal.submittedAt,
        dueBy: appeal.dueBy,
      },
    });
  } catch (error) {
    console.error("Submit appeal error:", error);
    res.status(500).json({ success: false, message: "Failed to submit appeal." });
  }
};

// ======================================================
// ADMIN
// ======================================================

const listAppeals = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const skip = (page - 1) * limit;
    const { status } = req.query;

    const filter = {};
    if (status && status !== "all") filter.status = status;

    const [appeals, total] = await Promise.all([
      Appeal.find(filter)
        .populate("user", "name email profileImage isBanned suspendedUntil banReason suspendReason")
        .sort({ submittedAt: -1 })
        .skip(skip)
        .limit(limit),
      Appeal.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: appeals,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("List appeals error:", error);
    res.status(500).json({ success: false, message: "Failed to load appeals." });
  }
};

const resolveAppeal = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminNote } = req.body;

    if (!["accepted", "rejected"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be 'accepted' or 'rejected'.",
      });
    }

    const appeal = await Appeal.findById(id);
    if (!appeal) {
      return res.status(404).json({ success: false, message: "Appeal not found." });
    }
    if (appeal.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: "This appeal has already been resolved.",
      });
    }

    appeal.status = status;
    appeal.resolvedAt = new Date();
    appeal.resolvedBy = req.user._id;
    appeal.adminNote = adminNote || "";
    await appeal.save();

    if (status === "accepted") {
      const user = await User.findById(appeal.user);
      if (user) {
        if (appeal.type === "ban") {
          user.isBanned = false;
          user.bannedAt = null;
          user.banReason = "";
          user.bannedBy = null;
        } else {
          user.suspendedUntil = null;
          user.suspendReason = "";
          user.suspendedBy = null;
        }
        await user.save();

        try {
          await notificationController.createNotification(
            user._id,
            "appeal_accepted",
            "Appeal Accepted",
            adminNote || "Your appeal has been accepted. You can now use your account.",
            { extra: { appealId: appeal._id } }
          );
        } catch (e) {
          console.error("Appeal accepted notification error:", e.message);
        }
      }
    } else {
      try {
        await notificationController.createNotification(
          appeal.user,
          "appeal_rejected",
          "Appeal Rejected",
          adminNote || "Your appeal has been rejected.",
          { extra: { appealId: appeal._id } }
        );
      } catch (e) {
        console.error("Appeal rejected notification error:", e.message);
      }
    }

    res.json({ success: true, message: `Appeal ${status}.`, data: appeal });
  } catch (error) {
    console.error("Resolve appeal error:", error);
    res.status(500).json({ success: false, message: "Failed to resolve appeal." });
  }
};

module.exports = {
  submitAppeal,
  listAppeals,
  resolveAppeal,
};