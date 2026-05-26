const express = require("express");
const router = express.Router();
const bookingController = require("../controllers/bookingController");
const protect = require("../middleware/authMiddleware"); // ✅ correct filename

// Then apply protect to routes (optional, but recommended)
router.post("/", protect, bookingController.createBooking);
router.get("/", protect, bookingController.getBookings);
router.post("/initialize-payment", protect, bookingController.initializePayment);
router.get("/verify-payment/:reference", protect, bookingController.verifyPaymentStatus);
router.put("/:id/complete", protect, bookingController.markBookingCompleted);
router.put("/:id/confirm", protect, bookingController.clientConfirmCompletion);
router.put("/:id/release", protect, bookingController.releasePayment);
router.post("/withdraw", protect, bookingController.withdrawFunds);

module.exports = router;