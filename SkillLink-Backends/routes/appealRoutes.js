const express = require("express");
const router = express.Router();
const { submitAppeal } = require("../controllers/appealController");

// Public — banned users can't pass authMiddleware, so no token required.
// They prove identity via email + password in the request body.
router.post("/", submitAppeal);

module.exports = router;