const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const {
  sendMessage,
  getMessages,
  markChatAsRead,
} = require("../controllers/chatController");

router.post("/:bookingId/messages", protect, sendMessage);
router.get("/:bookingId/messages", protect, getMessages);
router.put("/:bookingId/read", protect, markChatAsRead);

module.exports = router;