const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const {
  sendMessage,
  getMessages,
  markChatAsRead,
  sendProductMessage,
  getProductMessages
} = require("../controllers/chatController");

router.post("/:bookingId/messages", protect, sendMessage);
router.get("/:bookingId/messages", protect, getMessages);
router.put("/:bookingId/read", protect, markChatAsRead);
router.post("/product/:productId/messages", protect, sendProductMessage);
router.get("/product/:productId/messages/:otherUserId", protect, getProductMessages);

module.exports = router;