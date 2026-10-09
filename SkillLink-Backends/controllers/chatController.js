const Message = require("../models/Message");
const Booking = require("../models/Booking");
const User = require("../models/User");
const { checkContact } = require("../utils/contactFilter");
const notificationController = require("./notificationController");

// Statuses that allow chatting
const CHAT_ACTIVE_STATUSES = [
  "paid_in_escrow",
  "in_progress",
  "completed",
  "ready_for_release",
  "released",
];

// Completed chats close 24 hours after completion
const CLOSE_HOURS_AFTER_COMPLETED = 24;

/**
 * Check if a booking's chat is currently open
 */
const isChatOpen = (booking) => {
  if (!CHAT_ACTIVE_STATUSES.includes(booking.status)) return false;

  if (booking.status === "completed" || booking.status === "released") {
    const completedAt = booking.updatedAt || booking.createdAt;
    const hoursSince =
      (Date.now() - new Date(completedAt).getTime()) / (1000 * 60 * 60);
    if (hoursSince > CLOSE_HOURS_AFTER_COMPLETED) return false;
  }

  return true;
};

/**
 * POST /api/chat/:bookingId/messages
 * Send a message to a booking's chat
 */
const sendMessage = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { text, location } = req.body;
    const userId = req.user._id;

    const hasText = text && text.trim().length > 0;
    const hasLocation = location && typeof location.lat === "number" && typeof location.lng === "number";

    if (!hasText && !hasLocation) {
      return res.status(400).json({ success: false, message: "Message cannot be empty" });
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    const isClient = booking.client.toString() === userId.toString();
    const isProvider = booking.provider.toString() === userId.toString();
    if (!isClient && !isProvider) {
      return res.status(403).json({ success: false, message: "Not a participant" });
    }

    if (!isChatOpen(booking)) {
      return res.status(400).json({
        success: false,
        message: "Chat is not active for this booking.",
      });
    }

    // ===== LOCATION MESSAGE =====
    if (hasLocation) {
      const locType = location.type;
      if (!["work_location", "in_transit", "arrived"].includes(locType)) {
        return res.status(400).json({ success: false, message: "Invalid location type" });
      }

      // Client can only send work_location
      if (isClient && locType !== "work_location") {
        return res.status(403).json({ success: false, message: "Only providers can send transit updates" });
      }
      // Provider can only send in_transit or arrived
      if (isProvider && locType === "work_location") {
        return res.status(403).json({ success: false, message: "Only clients can share work location" });
      }

      const fallbackText =
        locType === "work_location"
          ? (location.label || "Shared work location")
          : locType === "in_transit"
          ? "I'm on my way"
          : "I've arrived";

      const message = await Message.create({
        booking: bookingId,
        sender: userId,
        text: fallbackText,
        location: {
          lat: Number(location.lat),
          lng: Number(location.lng),
          label: location.label || "",
          type: locType,
        },
      });

      const populated = await Message.findById(message._id).populate(
        "sender",
        "name profileImage"
      );

      // Notify the other party
      try {
        const recipientId = isClient ? booking.provider : booking.client;
        const senderName = req.user?.name || "Someone";
        const preview =
          locType === "work_location"
            ? `${senderName} shared the work location`
            : locType === "in_transit"
            ? `${senderName} is on the way`
            : `${senderName} has arrived`;

        await notificationController.createNotification(
          recipientId,
          "chat_message",
          `New message from ${senderName}`,
          preview,
          {
            bookingId: booking._id,
            clientId: booking.client,
            providerId: booking.provider,
          }
        );
      } catch (notifError) {
        console.error("❌ Location notification error:", notifError.message);
      }

      return res.status(201).json({ success: true, data: populated });
    }

    // ===== TEXT MESSAGE =====
    const { blocked, reason, cleaned } = checkContact(text);
    if (blocked) {
      console.log(`🚫 Blocked message from ${userId}: ${reason}`);
      return res.status(400).json({
        success: false,
        blocked: true,
        message: reason,
      });
    }

    const message = await Message.create({
      booking: bookingId,
      sender: userId,
      text: cleaned,
    });

    const populated = await Message.findById(message._id).populate(
      "sender",
      "name profileImage"
    );

    try {
      const recipientId = isClient ? booking.provider : booking.client;
      const senderName = req.user?.name || "Someone";
      const preview = cleaned.length > 60 ? cleaned.substring(0, 60) + "…" : cleaned;

      await notificationController.createNotification(
        recipientId,
        "chat_message",
        `New message from ${senderName}`,
        preview,
        {
          bookingId: booking._id,
          clientId: booking.client,
          providerId: booking.provider,
        }
      );
    } catch (notifError) {
      console.error("❌ Chat notification error:", notifError.message);
    }

    return res.status(201).json({ success: true, data: populated });
  } catch (error) {
    console.error("Send message error:", error.message);
    return res.status(500).json({ success: false, message: "Failed to send message" });
  }
};

/**
 * GET /api/chat/:bookingId/messages
 * Get all messages for a booking
 */
const getMessages = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const userId = req.user._id;

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    const isClient = booking.client.toString() === userId.toString();
    const isProvider = booking.provider.toString() === userId.toString();
    if (!isClient && !isProvider) {
      return res.status(403).json({ success: false, message: "Not a participant" });
    }

    const messages = await Message.find({ booking: bookingId })
      .populate("sender", "name profileImage")
      .sort({ createdAt: 1 });

    return res.json({
      success: true,
      data: messages,
      chatOpen: isChatOpen(booking),
      bookingStatus: booking.status,
      booking: {
      _id: booking._id,
      client: booking.client,
      provider: booking.provider,
      status: booking.status,
      },
    });
  } catch (error) {
    console.error("Get messages error:", error.message);
    return res.status(500).json({ success: false, message: "Failed to load messages" });
  }
};

module.exports = { sendMessage, getMessages, isChatOpen };