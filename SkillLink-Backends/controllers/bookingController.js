const Booking = require("../models/Booking");
const escrowService = require("../services/escrowService");
const paystackService = require("../services/paystackService");
const { v4: uuidv4 } = require("uuid");
const walletService = require("../services/walletService");

// ======================================================
//  INTERNAL HELPER – MUST BE DEFINED BEFORE USE
// ======================================================
const releaseFundsToProvider = async (bookingId) => {
  const booking = await Booking.findById(bookingId);
  if (!booking) throw new Error("Booking not found");
  if (booking.status !== "ready_for_release") {
    throw new Error("Booking not ready for release");
  }
  await walletService.creditWallet(
    booking.provider,
    booking.price,
    booking._id,
    booking.payment?.reference || "no_reference"
  );
  booking.status = "released";
  if (booking.payment) {
    booking.payment.escrowStatus = "released";
  }
  await booking.save();
  return booking;
};

// ======================================================
//  CONTROLLER FUNCTIONS
// ======================================================

/**
 * CREATE BOOKING (supports new fields: message, status)
 */
const createBooking = async (req, res) => {
  try {
    if (!req.body.status) {
      req.body.status = "pending_acceptance";
    }
    const booking = await Booking.create(req.body);
    res.status(201).json({
      success: true,
      data: booking,
    });
  } catch (error) {
    console.error("❌ Error in createBooking:", error); // full error stack
    res.status(500).json({
      success: false,
      message: error.message,
      stack: error.stack, // include stack for debugging
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
 * GET BOOKING BY ID (for polling)
 */
const getBookingById = async (req, res) => {
  try {
    const { id } = req.params;
    const booking = await Booking.findById(id)
      .populate("client", "name profileImage")
      .populate("provider", "name profileImage");
    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }
    res.json({ success: true, data: booking });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * PROVIDER ACCEPTS BOOKING
 */
const acceptBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }
    if (booking.status !== "pending_acceptance") {
      return res.status(400).json({
        success: false,
        message: "Booking is not in pending state",
      });
    }
    if (booking.expiresAt && booking.expiresAt < new Date()) {
      booking.status = "cancelled";
      await booking.save();
      return res.status(400).json({
        success: false,
        message: "Request has expired",
      });
    }
    booking.status = "accepted";
    booking.acceptedAt = new Date();
    await booking.save();
    res.json({
      success: true,
      message: "Booking accepted",
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
 * PROVIDER REJECTS BOOKING
 */
const rejectBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }
    if (booking.status !== "pending_acceptance") {
      return res.status(400).json({
        success: false,
        message: "Booking is not in pending state",
      });
    }
    booking.status = "rejected";
    await booking.save();
    res.json({
      success: true,
      message: "Booking rejected",
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
 * CLIENT CANCELS PENDING REQUEST
 */
const cancelBookingRequest = async (req, res) => {
  console.log("🔴 cancelBookingRequest called for ID:", req.params.id);
  try {
    const { id } = req.params;
    const booking = await Booking.findById(id);
    if (!booking) {
      console.log("Booking not found")
      return res.status(404).json({ success: false, message: "Booking not found" });
    }
    if (booking.status !== "pending_acceptance") {
      console.log("❌ Cannot cancel – status is not pending_acceptance");
      return res.status(400).json({
        success: false,
        message: "Booking cannot be cancelled",
      });
    }
    booking.status = "cancelled";
    await booking.save();
    console.log("✅ Status updated to cancelled, saved");
    res.json({
      success: true,
      message: "Request cancelled",
      data: booking,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ======================================================
//  PAYMENT & ESCROW (use the helper defined above)
// ======================================================

/**
 * INITIATE PAYMENT (PAYSTACK)
 */
const initializePayment = async (req, res) => {
  try {
    const { bookingId } = req.body;
    console.log("📦 initializePayment called with bookingId:", bookingId);

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    console.log("💰 Booking price:", booking.price);
    console.log("👤 User email:", req.user?.email);

    // Ensure price is a number
    const amount = Number(booking.price);
    if (isNaN(amount) || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid booking price",
      });
    }

    const reference = `skilllink_${uuidv4()}`;
    const payment = await paystackService.initializePayment({
      email: req.user?.email || "test@example.com",
      amount: amount, // pass as Naira; paystackService multiplies by 100
      reference,
    });

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
    console.error("❌ initializePayment error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
/**
 * HOLD PAYMENT IN ESCROW (DISABLED)
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
 * RELEASE PAYMENT (uses helper)
 */
const releasePayment = async (req, res) => {
  try {
    const { id } = req.params;
    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }
    if (booking.status !== "ready_for_release") {
      return res.status(400).json({
        success: false,
        message: "Booking not ready for release (client must confirm first)",
      });
    }
    const updated = await releaseFundsToProvider(id);
    res.json({
      success: true,
      message: "Funds released to provider's wallet",
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

/**
 * MARK BOOKING AS COMPLETED (PROVIDER)
 */
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
    if (booking.status !== "paid_in_escrow") {
      return res.status(400).json({
        success: false,
        message: "Only bookings with funds in escrow can be marked as completed",
      });
    }
    booking.status = "completed";
    await booking.save();
    res.json({
      success: true,
      message: "Job marked as completed. Waiting for client confirmation.",
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
 * CLIENT CONFIRMS COMPLETION → TRIGGER FUND RELEASE
 */
const clientConfirmCompletion = async (req, res) => {
  try {
    const { id } = req.params;
    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }
    if (booking.status !== "completed") {
      return res.status(400).json({
        success: false,
        message: "Job not yet marked as completed by provider",
      });
    }
    booking.status = "ready_for_release";
    await booking.save();
    const releasedBooking = await releaseFundsToProvider(booking._id);
    return res.json({
      success: true,
      message: "Job confirmed, funds released to provider's wallet",
      data: releasedBooking,
    });
  } catch (error) {
    console.error("Confirmation error:", error.message);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * WITHDRAW FUNDS
 */
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

/**
 * VERIFY PAYMENT STATUS
 */
const verifyPaymentStatus = async (req, res) => {
  try {
    const { reference } = req.params;
    const paystackData = await paystackService.verifyPayment(reference);
    if (!paystackData || paystackData.status !== "success") {
      return res.status(400).json({
        success: false,
        message: "Payment not successful",
      });
    }
    const booking = await Booking.findOne({
      "payment.reference": reference,
    });
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }
    if (booking.payment.status === "paid") {
      return res.json({
        success: true,
        message: "Already verified",
        data: booking,
      });
    }
    booking.payment.status = "paid";
    booking.payment.escrowStatus = "funded";
    booking.payment.escrowHeld = true;
    booking.payment.amountPaid = paystackData.amount / 100;
    booking.payment.paidAt = new Date();
    booking.status = "paid_in_escrow";
    await booking.save();
    return res.json({
      success: true,
      message: "Payment verified and escrow funded",
      data: booking,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ======================================================
//  EXPORTS
// ======================================================
module.exports = {
  createBooking,
  getBookings,
  getBookingById,
  acceptBooking,
  rejectBooking,
  cancelBookingRequest,
  verifyPaymentStatus,
  initializePayment,
  holdPayment,
  releasePayment,
  markBookingCompleted,
  withdrawFunds,
  clientConfirmCompletion,
};