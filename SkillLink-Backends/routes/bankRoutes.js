const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const { getBanks, resolveAccount, saveBankDetails, getBankDetails } = require("../controllers/bankController");

router.get("/banks", protect, getBanks);
router.post("/resolve", protect, resolveAccount);
router.post("/save", protect, saveBankDetails);
router.get("/details", protect, getBankDetails);

module.exports = router;