const Message = require("../models/Message");
const Booking = require("../models/Booking");
const User = require("../models/User");
const { checkContact } = require("../utils/contactFilter");
const notificationController = require("./notificationController");
const Product = require("../models/Product");

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

// ===== HELPER: catch phone numbers split across multiple messages =====
// e.g. "0810" + "0012" + "1234" → "081000121234" → blocked on the 3rd message.
const checkAccumulatedDigits = async (bookingId, senderId, newText) => {
  const WINDOW_MINUTES = 30;
  const MAX_MESSAGES = 10;
  const since = new Date(Date.now() - WINDOW_MINUTES * 60 * 1000);

  let recent = [];
  try {
    recent = await Message.find({
      booking: bookingId,
      sender: senderId,
      createdAt: { $gte: since },
    })
      .sort({ createdAt: -1 })
      .limit(MAX_MESSAGES)
      .select("text")
      .lean();
  } catch (e) {
    // Fail-open: never block a legitimate user because of a DB hiccup
    console.error("Accumulated digit lookup error:", e.message);
    return { blocked: false };
  }

  // Chronological order (oldest → newest) + current message
  const combined = [...recent.reverse().map((m) => m.text || ""), newText]
    .join(" ")
    .replace(/[\s\-\.\(\)]/g, "");

  const runs = combined.match(/\d+/g) || [];
  if (runs.some((r) => r.length >= 10)) {
    return {
      blocked: true,
      reason:
        "Sharing phone numbers is not allowed. Keep conversations on Street.",
    };
  }
  return { blocked: false };
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

      // ✅ Filter the label so users can't smuggle contact info via location labels
      const labelCheck = checkContact(location.label || "");
      if (labelCheck.blocked) {
        console.log(`🚫 Blocked location label from ${userId}: ${labelCheck.reason}`);
        return res.status(400).json({
          success: false,
          blocked: true,
          message: labelCheck.reason,
        });
      }

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

    // ✅ Catch phone numbers split across multiple messages
    // e.g. "0810" + "0012" + "1234" → blocked on the 3rd message
    const accumulated = await checkAccumulatedDigits(bookingId, userId, text);
    if (accumulated.blocked) {
      console.log(`🚫 Blocked split-digit message from ${userId}`);
      return res.status(400).json({
        success: false,
        blocked: true,
        message: accumulated.reason,
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

/**
 * PUT /api/chat/:bookingId/read
 * Mark all messages from the OTHER party as read.
 * Called by the recipient's chat screen when they open/view the chat.
 */
const markChatAsRead = async (req, res) => {
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

    // Set readAt on all messages sent BY the other party that haven't been read yet
    const result = await Message.updateMany(
      {
        booking: bookingId,
        sender: { $ne: userId },
        readAt: null,
      },
      { $set: { readAt: new Date() } }
    );

    return res.json({
      success: true,
      updated: result.modifiedCount,
    });
  } catch (error) {
    console.error("Mark as read error:", error.message);
    return res.status(500).json({ success: false, message: "Failed to mark as read" });
  }
};

const sendProductMessage = async (req, res) => {
  try {
    const { productId } = req.params;
    const { text, recipientId } = req.body; // recipientId is the seller's ID
    const userId = req.user._id;

    if (!text || text.trim().length === 0) {
      return res.status(400).json({ success: false, message: "Message cannot be empty" });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    // ✅ Allow both directions:
    //   - Buyer → Seller (recipient is owner)
    //   - Seller → Buyer (sender is owner)
    if (String(userId) === String(recipientId)) {
      return res.status(400).json({ success: false, message: "You cannot message yourself" });
    }

    const senderIsOwner = String(product.user) === String(userId);
    const recipientIsOwner = String(product.user) === String(recipientId);

    if (!senderIsOwner && !recipientIsOwner) {
      return res.status(403).json({
        success: false,
        message: "You can only chat about this product with the seller or a buyer",
      });
    }

    // Product chats have no escrow and no on-platform payment, so blocking
    // contact exchange only pushes deals off-platform where we lose the
    // evidence trail. Booking chat (sendMessage) still enforces the filter
    // because of escrow protection.
    const message = await Message.create({
      product: productId,
      sender: userId,
      recipient: recipientId,
      text: text.trim(),
    });

    const populated = await Message.findById(message._id).populate("sender", "name profileImage");

    // ✅ Notify the recipient (seller if buyer sent, buyer if seller replied)
    try {
      const senderName = req.user?.name || "Someone";
      const preview = text.length > 60 ? text.substring(0, 60) + "…" : text;

      await notificationController.createNotification(
        recipientId,
        "chat_message",
        `New message from ${senderName}`,
        preview,
        {
          clientId: userId,       // sender
          providerId: recipientId, // receiver
          extra: { productId: productId },
        }
      );
    } catch (notifError) {
      console.error("❌ Product chat notification error:", notifError.message);
    }

    return res.status(201).json({ success: true, data: populated });
  } catch (error) {
    console.error("Send product message error:", error.message);
    return res.status(500).json({ success: false, message: "Failed to send message" });
  }
};

/**
 * GET /api/chat/product/:productId/messages/:otherUserId
 * Get messages between the current user and the other user regarding a product
 */
const getProductMessages = async (req, res) => {
  try {
    const { productId, otherUserId } = req.params;
    const userId = req.user._id;

    const messages = await Message.find({
      product: productId,
      $or: [
        { sender: userId, recipient: otherUserId },
        { sender: otherUserId, recipient: userId },
      ],
    })
      .populate("sender", "name profileImage")
      .sort({ createdAt: 1 });

    // Mark incoming messages as read
    await Message.updateMany(
      { product: productId, sender: otherUserId, recipient: userId, readAt: null },
      { $set: { readAt: new Date() } }
    );

    return res.json({ success: true, data: messages, chatOpen: true });
  } catch (error) {
    console.error("Get product messages error:", error.message);
    return res.status(500).json({ success: false, message: "Failed to load messages" });
  }
};

module.exports = { sendMessage, getMessages, markChatAsRead, isChatOpen, sendProductMessage, getProductMessages };