const express = require("express");
const router = express.Router();
const bookingController = require("../controllers/bookingController");
const protect = require("../middleware/authMiddleware");

console.log("🔥 bookingRoutes.js is being executed");
console.log("========== ROUTE INIT ==========");
console.log("🔐 protect type:", typeof protect);
console.log("📦 bookingController:", bookingController);
console.log("📦 createBooking type:", typeof bookingController.createBooking);

// Test route (temporary)
router.post("/test", protect, (req, res) => {
  console.log("✅ Test route hit");
  res.json({ success: true, message: "Test route works" });
});

// Actual routes – we'll keep them all
router.post("/", protect, bookingController.createBooking);
router.get("/", protect, bookingController.getBookings);
router.get("/:id", protect, bookingController.getBookingById);
router.put("/:id/accept", protect, bookingController.acceptBooking);
router.put("/:id/reject", protect, bookingController.rejectBooking);
router.put("/:id/cancel-request", protect, bookingController.cancelBookingRequest);
router.post("/initialize-payment", protect, bookingController.initializePayment);
router.get("/verify-payment/:reference", protect, bookingController.verifyPaymentStatus);
router.put("/:id/complete", protect, bookingController.markBookingCompleted);
router.put("/:id/confirm", protect, bookingController.clientConfirmCompletion);
router.put("/:id/release", protect, bookingController.releasePayment);
router.post("/withdraw", protect, bookingController.withdrawFunds);

module.exports = router;