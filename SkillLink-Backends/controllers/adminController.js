const User = require("../models/User");
const Post = require("../models/Post");
const Booking = require("../models/Booking");
const Review = require("../models/Review");
const Report = require("../models/Report");
const Notification = require("../models/Notification");
const Wallet = require("../models/Wallet");
const notificationController = require("./notificationController");

// ======================================================
// HELPERS
// ======================================================
const pagination = (query, defaults = { page: 1, limit: 20 }) => {
  const page = Math.max(parseInt(query.page) || defaults.page, 1);
  const limit = Math.min(Math.max(parseInt(query.limit) || defaults.limit, 1), 100);
  return { page, limit, skip: (page - 1) * limit };
};

const respondList = (res, data, page, limit, total) => {
  res.json({
    success: true,
    data,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  });
};

// ======================================================
// DASHBOARD STATS
// ======================================================
const getStats = async (req, res) => {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      totalPosts,
      totalBookings,
      totalReviews,
      pendingReports,
      recentUsers,
      recentBookings,
      escrowBookings,
      releasedBookings,
    ] = await Promise.all([
      User.countDocuments(),
      Post.countDocuments(),
      Booking.countDocuments(),
      Review.countDocuments(),
      Report.countDocuments({ status: "pending" }),
      User.countDocuments({ createdAt: { $gte: sevenDaysAgo } }),
      Booking.countDocuments({ createdAt: { $gte: sevenDaysAgo } }),
      Booking.find({ status: { $in: ["paid_in_escrow", "completed", "ready_for_release"] } }).select("price"),
      Booking.find({ status: "released" }).select("price"),
    ]);

    const escrowHeld = escrowBookings.reduce((sum, b) => sum + (Number(b.price) || 0), 0);
    const totalReleased = releasedBookings.reduce((sum, b) => sum + (Number(b.price) || 0), 0);

    res.json({
      success: true,
      data: {
        totalUsers,
        totalPosts,
        totalBookings,
        totalReviews,
        pendingReports,
        recentUsers,
        recentBookings,
        escrowHeld,
        totalReleased,
      },
    });
  } catch (error) {
    console.error("Admin stats error:", error);
    res.status(500).json({ success: false, message: "Failed to load stats" });
  }
};

const getStatsChart = async (req, res) => {
  try {
    const days = Math.min(parseInt(req.query.days) || 30, 90);
    const since = new Date();
    since.setDate(since.getDate() - days);
    since.setHours(0, 0, 0, 0);

    const buildSeries = async (Model) => {
      const raw = await Model.aggregate([
        { $match: { createdAt: { $gte: since } } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]);
      const map = new Map(raw.map((r) => [r._id, r.count]));
      const series = [];
      for (let i = 0; i <= days; i++) {
        const d = new Date(since);
        d.setDate(d.getDate() + i);
        const key = d.toISOString().split("T")[0];
        series.push({ date: key, count: map.get(key) || 0 });
      }
      return series;
    };

    const [users, posts, bookings] = await Promise.all([
      buildSeries(User),
      buildSeries(Post),
      buildSeries(Booking),
    ]);

    res.json({ success: true, data: { users, posts, bookings } });
  } catch (error) {
    console.error("Admin chart error:", error);
    res.status(500).json({ success: false, message: "Failed to load chart" });
  }
};

// ======================================================
// USERS
// ======================================================
const listUsers = async (req, res) => {
  try {
    const { page, limit, skip } = pagination(req.query);
    const { search, verified } = req.query;

    const filter = {};
    if (search && search.trim()) {
      const rx = { $regex: search.trim(), $options: "i" };
      filter.$or = [{ name: rx }, { email: rx }, { phone: rx }];
    }
    if (verified === "true") filter.isVerified = true;
    if (verified === "false") filter.isVerified = false;

    const [users, total] = await Promise.all([
      User.find(filter)
        .select("name email phone profileImage isVerified isBanned bannedAt banReason suspendedUntil suspendReason warnings rating jobsCompleted lastActive createdAt scheduledDeletionAt")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      User.countDocuments(filter),
    ]);

    respondList(res, users, page, limit, total);
  } catch (error) {
    console.error("Admin list users error:", error);
    res.status(500).json({ success: false, message: "Failed to load users" });
  }
};

const getUserDetail = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select(
      "-password -verificationToken -verificationTokenExpires"
    );
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    const [posts, bookingsAsClient, bookingsAsProvider, reviewsWritten, reviewsReceived] =
      await Promise.all([
        Post.find({ user: user._id }).sort({ createdAt: -1 }).limit(50),
        Booking.find({ client: user._id })
          .populate("provider", "name profileImage")
          .sort({ createdAt: -1 })
          .limit(50),
        Booking.find({ provider: user._id })
          .populate("client", "name profileImage")
          .sort({ createdAt: -1 })
          .limit(50),
        Review.find({ client: user._id })
          .populate("provider", "name")
          .sort({ createdAt: -1 })
          .limit(50),
        Review.find({ provider: user._id })
          .populate("client", "name profileImage")
          .sort({ createdAt: -1 })
          .limit(50),
      ]);

    res.json({
      success: true,
      data: {
        user,
        posts,
        bookingsAsClient,
        bookingsAsProvider,
        reviewsWritten,
        reviewsReceived,
      },
    });
  } catch (error) {
    console.error("Admin user detail error:", error);
    res.status(500).json({ success: false, message: "Failed to load user" });
  }
};

const toggleUserVerification = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    user.isVerified = !user.isVerified;
    await user.save();

    res.json({ success: true, data: { isVerified: user.isVerified } });
  } catch (error) {
    console.error("Admin verify user error:", error);
    res.status(500).json({ success: false, message: "Failed to toggle verification" });
  }
};

const deleteUser = async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    // Same cleanup as permanentlyDeleteUser in routes/users.js
    const posts = await Post.find({ user: userId });
    for (const post of posts) await post.deleteOne();
    await Wallet.deleteOne({ provider: userId });
    await Notification.deleteMany({ user: userId });
    await Review.deleteMany({ $or: [{ client: userId }, { provider: userId }] });
    await Report.deleteMany({ $or: [{ reporter: userId }, { reportedUser: userId }] });
    await Booking.updateMany(
      { $or: [{ client: userId }, { provider: userId }] },
      { $set: { deletedAccount: true, clientAnonymized: true } }
    );
    await User.findByIdAndDelete(userId);

    res.json({ success: true, message: "User permanently deleted" });
  } catch (error) {
    console.error("Admin delete user error:", error);
    res.status(500).json({ success: false, message: "Failed to delete user" });
  }
};

// ======================================================
// POSTS
// ======================================================
const listPosts = async (req, res) => {
  try {
    const { page, limit, skip } = pagination(req.query);
    const { search, userId } = req.query;

    const filter = {};
    if (search && search.trim()) {
      const rx = { $regex: search.trim(), $options: "i" };
      filter.$or = [{ skill: rx }, { description: rx }, { tags: rx }];
    }
    if (userId) filter.user = userId;

    const [posts, total] = await Promise.all([
      Post.find(filter)
        .populate("user", "name email profileImage isVerified")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Post.countDocuments(filter),
    ]);

    respondList(res, posts, page, limit, total);
  } catch (error) {
    console.error("Admin list posts error:", error);
    res.status(500).json({ success: false, message: "Failed to load posts" });
  }
};

const deletePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ success: false, message: "Post not found" });
    await post.deleteOne();
    res.json({ success: true, message: "Post deleted" });
  } catch (error) {
    console.error("Admin delete post error:", error);
    res.status(500).json({ success: false, message: "Failed to delete post" });
  }
};

// ======================================================
// BOOKINGS
// ======================================================
const listBookings = async (req, res) => {
  try {
    const { page, limit, skip } = pagination(req.query);
    const { status, userId } = req.query;

    const filter = {};
    if (status && status !== "all") filter.status = status;
    if (userId) filter.$or = [{ client: userId }, { provider: userId }];

    const [bookings, total] = await Promise.all([
      Booking.find(filter)
        .populate("client", "name email profileImage")
        .populate("provider", "name email profileImage")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Booking.countDocuments(filter),
    ]);

    respondList(res, bookings, page, limit, total);
  } catch (error) {
    console.error("Admin list bookings error:", error);
    res.status(500).json({ success: false, message: "Failed to load bookings" });
  }
};

// ======================================================
// REPORTS
// ======================================================
const listReports = async (req, res) => {
  try {
    const { page, limit, skip } = pagination(req.query);
    const { status, type } = req.query;

    const filter = {};
    if (status && status !== "all") filter.status = status;
    if (type && type !== "all") filter.type = type;

    const [reports, total] = await Promise.all([
      Report.find(filter)
        .populate("reporter", "name email profileImage")
        .populate("reportedUser", "name email profileImage isVerified")
        .populate({ path: "reportedPost", populate: { path: "user", select: "name email" } })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Report.countDocuments(filter),
    ]);

    respondList(res, reports, page, limit, total);
  } catch (error) {
    console.error("Admin list reports error:", error);
    res.status(500).json({ success: false, message: "Failed to load reports" });
  }
};

const updateReportStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!["reviewed", "dismissed", "actioned", "pending"].includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status" });
    }
    const report = await Report.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    if (!report) return res.status(404).json({ success: false, message: "Report not found" });
    res.json({ success: true, data: report });
  } catch (error) {
    console.error("Admin update report error:", error);
    res.status(500).json({ success: false, message: "Failed to update report" });
  }
};

// ======================================================
// REVIEWS
// ======================================================
const listReviews = async (req, res) => {
  try {
    const { page, limit, skip } = pagination(req.query);
    const { userId } = req.query;

    const filter = {};
    if (userId) filter.$or = [{ client: userId }, { provider: userId }];

    const [reviews, total] = await Promise.all([
      Review.find(filter)
        .populate("client", "name email profileImage")
        .populate("provider", "name email profileImage")
        .populate("post", "skill description price")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Review.countDocuments(filter),
    ]);

    respondList(res, reviews, page, limit, total);
  } catch (error) {
    console.error("Admin list reviews error:", error);
    res.status(500).json({ success: false, message: "Failed to load reviews" });
  }
};

const deleteReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ success: false, message: "Review not found" });
    await review.deleteOne();

    // Recalculate provider rating
    const remaining = await Review.find({ provider: review.provider });
    if (remaining.length > 0) {
      const avg = remaining.reduce((s, r) => s + r.rating, 0) / remaining.length;
      await User.findByIdAndUpdate(review.provider, { rating: Math.round(avg * 10) / 10 });
    } else {
      await User.findByIdAndUpdate(review.provider, { rating: 0 });
    }

    res.json({ success: true, message: "Review deleted" });
  } catch (error) {
    console.error("Admin delete review error:", error);
    res.status(500).json({ success: false, message: "Failed to delete review" });
  }
};

// ======================================================
// TRANSACTIONS
// ======================================================
const listTransactions = async (req, res) => {
  try {
    const { page, limit, skip } = pagination(req.query);

    const wallets = await Wallet.find().populate("provider", "name email profileImage");

    const allTx = [];
    for (const w of wallets) {
      for (const tx of w.transactions || []) {
        allTx.push({
          _id: tx._id,
          provider: w.provider,
          type: tx.type,
          amount: tx.amount,
          description: tx.description,
          reference: tx.reference,
          bookingId: tx.bookingId,
          createdAt: tx.createdAt,
        });
      }
    }
    allTx.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const total = allTx.length;
    const paged = allTx.slice(skip, skip + limit);

    respondList(res, paged, page, limit, total);
  } catch (error) {
    console.error("Admin list transactions error:", error);
    res.status(500).json({ success: false, message: "Failed to load transactions" });
  }
};

// ======================================================
// USER ACTIONS — WARN / SUSPEND / BAN / LIFT
// ======================================================
const _applyAction = async ({ targetUserId, action, reason, durationDays, actedBy, reportId }) => {
  const targetUser = await User.findById(targetUserId);
  if (!targetUser) throw new Error("Target user not found");

  if (targetUser.email === process.env.ADMIN_EMAIL) {
    throw new Error("Cannot take action against an admin");
  }

  if (action === "warning") {
    targetUser.warnings.push({
      reason: reason || "Violation of community guidelines",
      issuedBy: actedBy,
      issuedAt: new Date(),
      reportId: reportId || null,
    });
    await targetUser.save();

    try {
      await notificationController.createNotification(
        targetUser._id,
        "warning_received",
        "Warning Issued",
        reason || "You have received a warning for violating our community guidelines.",
        { extra: { reportId: reportId || null } }
      );
    } catch (e) {
      console.error("Warning notification error:", e.message);
    }
  }

  if (action === "suspension") {
    const days = Math.max(1, Math.min(parseInt(durationDays) || 7, 365));
    const until = new Date();
    until.setDate(until.getDate() + days);

    targetUser.suspendedUntil = until;
    targetUser.suspendReason = reason || "Violation of community guidelines";
    targetUser.suspendedBy = actedBy;
    await targetUser.save();

    try {
      await notificationController.createNotification(
        targetUser._id,
        "account_suspended",
        "Account Suspended",
        `Your account has been suspended until ${until.toDateString()}. Reason: ${targetUser.suspendReason}`,
        { extra: { reportId: reportId || null, suspendedUntil: until } }
      );
    } catch (e) {
      console.error("Suspension notification error:", e.message);
    }
  }

  if (action === "ban") {
    targetUser.isBanned = true;
    targetUser.bannedAt = new Date();
    targetUser.banReason = reason || "Severe violation of community guidelines";
    targetUser.bannedBy = actedBy;
    await targetUser.save();

    try {
      await notificationController.createNotification(
        targetUser._id,
        "account_banned",
        "Account Banned",
        `Your account has been permanently banned. Reason: ${targetUser.banReason}`,
        { extra: { reportId: reportId || null } }
      );
    } catch (e) {
      console.error("Ban notification error:", e.message);
    }
  }

  return targetUser;
};

const takeReportAction = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, reason, durationDays } = req.body;

    if (!["warning", "suspension", "ban", "dismiss"].includes(action)) {
      return res.status(400).json({ success: false, message: "Invalid action" });
    }

    const report = await Report.findById(id);
    if (!report) return res.status(404).json({ success: false, message: "Report not found" });

    if (action === "dismiss") {
      report.status = "dismissed";
      report.adminAction = {
        action: "none",
        reason: reason || "Dismissed by admin",
        actedBy: req.user._id,
        actedAt: new Date(),
      };
      await report.save();
      return res.json({ success: true, message: "Report dismissed" });
    }

    let targetUserId = null;
    if (report.type === "user" && report.reportedUser) {
      targetUserId = report.reportedUser;
    } else if (report.type === "post" && report.reportedPost) {
      const post = await Post.findById(report.reportedPost);
      if (post) targetUserId = post.user;
    }

    if (!targetUserId) {
      return res.status(400).json({ success: false, message: "Cannot determine target user" });
    }

    const targetUser = await _applyAction({
      targetUserId,
      action,
      reason,
      durationDays,
      actedBy: req.user._id,
      reportId: report._id,
    });

    report.status = "actioned";
    report.adminAction = {
      action,
      reason: reason || "",
      durationDays: action === "suspension" ? Math.max(1, Math.min(parseInt(durationDays) || 7, 365)) : null,
      actedBy: req.user._id,
      actedAt: new Date(),
    };
    await report.save();

    res.json({
      success: true,
      message: `${action} applied`,
      data: {
        report,
        targetUser: {
          _id: targetUser._id,
          name: targetUser.name,
          isBanned: targetUser.isBanned,
          suspendedUntil: targetUser.suspendedUntil,
          warningsCount: targetUser.warnings.length,
        },
      },
    });
  } catch (error) {
    console.error("Admin report action error:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to take action" });
  }
};

const takeUserAction = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, reason, durationDays } = req.body;

    if (!["warning", "suspension", "ban", "unban", "unsuspend"].includes(action)) {
      return res.status(400).json({ success: false, message: "Invalid action" });
    }

    const targetUser = await User.findById(id);
    if (!targetUser) return res.status(404).json({ success: false, message: "User not found" });
    if (targetUser.email === process.env.ADMIN_EMAIL) {
      return res.status(400).json({ success: false, message: "Cannot take action against an admin" });
    }

    if (action === "unban") {
      targetUser.isBanned = false;
      targetUser.bannedAt = null;
      targetUser.banReason = "";
      targetUser.bannedBy = null;
      await targetUser.save();
      return res.json({ success: true, message: "User unbanned" });
    }

    if (action === "unsuspend") {
      targetUser.suspendedUntil = null;
      targetUser.suspendReason = "";
      targetUser.suspendedBy = null;
      await targetUser.save();
      return res.json({ success: true, message: "Suspension lifted" });
    }

    const updated = await _applyAction({
      targetUserId: id,
      action,
      reason,
      durationDays,
      actedBy: req.user._id,
      reportId: null,
    });

    res.json({
      success: true,
      message: `${action} applied`,
      data: {
        _id: updated._id,
        isBanned: updated.isBanned,
        suspendedUntil: updated.suspendedUntil,
        warningsCount: updated.warnings.length,
      },
    });
  } catch (error) {
    console.error("Admin user action error:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to take action" });
  }
};

module.exports = {
  getStats,
  getStatsChart,
  listUsers,
  getUserDetail,
  toggleUserVerification,
  deleteUser,
  listPosts,
  deletePost,
  listBookings,
  listReports,
  updateReportStatus,
  listReviews,
  deleteReview,
  listTransactions,
  takeReportAction,
  takeUserAction,
};