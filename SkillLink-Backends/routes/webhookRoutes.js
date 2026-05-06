const express = require("express");
const router = express.Router();
const webhookController = require("../controllers/webhookController");

// IMPORTANT: raw body required for signature verification
router.post(
  "/paystack",webhookController.handlePaystackWebhook
);

module.exports = router;