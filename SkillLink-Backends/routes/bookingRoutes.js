const express = require("express");
const router = express.Router();

const bookingController = require("../controllers/bookingController");

router.post("/", bookingController.createBooking);
router.get("/", bookingController.getBookings);

router.post("/hold", bookingController.holdPayment);
router.post("/release", bookingController.releasePayment);

module.exports = router;