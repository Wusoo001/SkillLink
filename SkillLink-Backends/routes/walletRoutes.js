const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware"); // your existing middleware
const { getBalance, withdraw } = require("../controllers/walletController");

router.get("/balance", protect, getBalance);
router.post("/withdraw", protect, withdraw);

module.exports = router;