const Booking = require("../models/Booking");
const escrowService = require("../services/escrowService");

/**
 * CREATE BOOKING
 */
const createBooking = async (req, res) => {
  try {
    const booking = await Booking.create(req.body);

    res.status(201).json({
      success: true,
      data: booking,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * GET USER BOOKINGS
 */
const getBookings = async (req, res) => {
  try {
    const bookings = await Booking.find()
      .populate("client")
      .populate("provider");

    res.json({
      success: true,
      data: bookings,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * HOLD PAYMENT IN ESCROW
 */
const holdPayment = async (req, res) => {
  try {
    const { bookingId, reference } = req.body;

    const updated = await escrowService.holdFunds(bookingId, reference);

    res.json({
      success: true,
      message: "Funds held in escrow",
      data: updated,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * RELEASE PAYMENT
 */
const releasePayment = async (req, res) => {
  try {
    const { bookingId } = req.body;

    const updated = await escrowService.releaseFunds(bookingId);

    res.json({
      success: true,
      message: "Funds released",
      data: updated,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createBooking,
  getBookings,
  holdPayment,
  releasePayment,
};