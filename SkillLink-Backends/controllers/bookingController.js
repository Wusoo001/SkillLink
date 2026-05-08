const Booking = require("../models/Booking");
const escrowService = require("../services/escrowService");
const paystackService = require("../services/paystackService");
const { v4: uuidv4 } = require("uuid");
const walletService = require("../services/walletService");
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
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * INITIATE PAYMENT (PAYSTACK)
 */
const initializePayment = async (req, res) => {
  try {
    const { bookingId } = req.body;

    const booking = await Booking.findById(bookingId);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    const reference = `skilllink_${uuidv4()}`;

    const payment = await paystackService.initializePayment({
      email: req.user?.email || "test@example.com",
      amount: booking.price,
      reference,
    });

    // update booking
    booking.payment.reference = reference;
    booking.payment.status = "pending";
    booking.status = "awaiting_payment";

    await booking.save();

    return res.json({
      success: true,
      authorization_url: payment.authorization_url,
      reference,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * HOLD PAYMENT IN ESCROW (DISABLED - SECURITY LAYER)
 */
const holdPayment = async (req, res) => {
  try {
    return res.status(403).json({
      success: false,
      message: "Manual escrow hold is disabled. Use payment flow.",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * RELEASE PAYMENT
 */
const releasePayment = async (req, res) => {
  try {
    const { id } = req.params; // ✅ from URL now

    const updated = await escrowService.releaseFunds(id);

    res.json({
      success: true,
      message: "Funds released",
      data: updated,
    });
  } catch (error) {
    console.error("Release error:", error.message);

    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};
const markBookingCompleted = async (req, res) => {
  try {
    const { id } = req.params;

    const booking = await Booking.findById(id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    // only escrowed bookings can be completed
    if (booking.status !== "paid_in_escrow") {
      return res.status(400).json({
        success: false,
        message: "Booking is not in escrow",
      });
    }

    booking.status = "completed";

    await booking.save();

    res.json({
      success: true,
      message: "Booking marked as completed",
      data: booking,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const withdrawFunds = async (req, res) => {
  try {
    const { providerId, amount } = req.body;

    const wallet = await walletService.debitWallet(
      providerId,
      amount,
      "Provider withdrawal"
    );

    res.json({
      success: true,
      message: "Withdrawal successful",
      data: wallet,
    });
  } catch (error) {
    console.error("Withdrawal error:", error.message);

    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};
module.exports = {
  createBooking,
  getBookings,
  initializePayment, // 🔥 newly added
  holdPayment,
  releasePayment,
  markBookingCompleted,
  withdrawFunds,
};