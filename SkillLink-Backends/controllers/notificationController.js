const Notification = require("../models/Notification");
const User = require("../models/User");

/**
 * Create a notification (internal helper)
 */
const createNotification = async (userId, type, title, message, data = {}) => {
  try {
    if (!userId) {
      console.error("❌ createNotification: userId is required");
      return null;
    }

    const notification = await Notification.create({
      user: userId,
      type,
      title,
      message,
      data,
    });

    console.log(`✅ Notification created for user ${userId}: ${title}`);
    return notification;
  } catch (error) {
    console.error("❌ Create notification error:", error);
    return null;
  }
};

/**
 * GET /api/notifications
 * Get all notifications for the current user
 */
const getNotifications = async (req, res) => {
  try {
    const userId = req.user._id;
    const { limit = 20, page = 1, unreadOnly = false } = req.query;

    const filter = { user: userId };
    if (unreadOnly === "true") {
      filter.read = false;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [notifications, total] = await Promise.all([
      Notification.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Notification.countDocuments(filter),
    ]);

    console.log(`✅ Found ${notifications.length} notifications for user ${userId}`);

    res.json({
      success: true,
      data: notifications,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("❌ Get notifications error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch notifications",
    });
  }
};

/**
 * GET /api/notifications/unread-count
 * Get count of unread notifications
 */
const getUnreadCount = async (req, res) => {
  try {
    const userId = req.user._id;
    const count = await Notification.countDocuments({
      user: userId,
      read: false,
    });

    console.log(`🔔 Unread count for user ${userId}: ${count}`);

    res.json({
      success: true,
      count,
    });
  } catch (error) {
    console.error("❌ Unread count error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get notification count",
    });
  }
};

/**
 * PUT /api/notifications/:id/read
 * Mark a single notification as read
 */
const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const notification = await Notification.findOne({ _id: id, user: userId });
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    notification.read = true;
    await notification.save();

    console.log(`✅ Notification ${id} marked as read`);

    res.json({
      success: true,
      message: "Notification marked as read",
    });
  } catch (error) {
    console.error("❌ Mark as read error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to mark notification as read",
    });
  }
};

/**
 * PUT /api/notifications/read-all
 * Mark all notifications as read
 */
const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user._id;

    const result = await Notification.updateMany(
      { user: userId, read: false },
      { read: true }
    );

    console.log(`✅ Marked ${result.modifiedCount} notifications as read for user ${userId}`);

    res.json({
      success: true,
      message: "All notifications marked as read",
    });
  } catch (error) {
    console.error("❌ Mark all as read error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to mark all notifications as read",
    });
  }
};

module.exports = {
  createNotification,
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
};