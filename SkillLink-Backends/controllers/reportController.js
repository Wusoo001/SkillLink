const Report = require("../models/Report");

/**
 * POST /api/reports
 * Submit a report against a user or post
 */
const createReport = async (req, res) => {
  try {
    const { type, reason, description, reportedUserId, reportedPostId } = req.body;
    const reporterId = req.user._id;

    // Validate
    if (!type || !["user", "post"].includes(type)) {
      return res.status(400).json({ success: false, message: "Invalid report type" });
    }
    if (!reason) {
      return res.status(400).json({ success: false, message: "Reason required" });
    }

    // Can't report yourself
    if (reportedUserId && reportedUserId.toString() === reporterId.toString()) {
      return res.status(400).json({ success: false, message: "You cannot report yourself" });
    }

    // Prevent duplicate pending reports
    const existing = await Report.findOne({
      reporter: reporterId,
      reportedUser: reportedUserId || null,
      reportedPost: reportedPostId || null,
      status: "pending",
    });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: "You already reported this. Our team will review it soon.",
      });
    }

    const report = await Report.create({
      reporter: reporterId,
      reportedUser: reportedUserId || null,
      reportedPost: reportedPostId || null,
      type,
      reason,
      description: description || "",
    });

    console.log(`📢 New report: ${type} / ${reason} / by ${reporterId}`);

    res.status(201).json({
      success: true,
      message: "Report submitted. Thank you for helping keep Street safe.",
      data: { _id: report._id },
    });
  } catch (error) {
    console.error("Create report error:", error.message);
    res.status(500).json({ success: false, message: "Failed to submit report" });
  }
};

module.exports = { createReport };