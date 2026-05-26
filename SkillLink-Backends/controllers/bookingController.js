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
 * RELEASE PAYMENT (modified to use helper and check client confirmation)
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
 * MARK BOOKING AS COMPLETED (PROVIDER SIDE)
 * Now sets status to "completed" (waiting for client confirmation)
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

    // only escrowed bookings can be marked as completed
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

    // Only allow if provider has marked as completed
    if (booking.status !== "completed") {
      return res.status(400).json({
        success: false,
        message: "Job not yet marked as completed by provider",
      });
    }

    // Update status and trigger release
    booking.status = "ready_for_release";
    await booking.save();

    // Now release funds (credits provider wallet)
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
 * INTERNAL HELPER: Release funds and credit provider's wallet
 * (used by releasePayment and clientConfirmCompletion)
 */
const releaseFundsToProvider = async (bookingId) => {
  const booking = await Booking.findById(bookingId);
  if (!booking) throw new Error("Booking not found");

  if (booking.status !== "ready_for_release") {
    throw new Error("Booking not ready for release");
  }

  // Credit provider's wallet using your walletService
  await walletService.creditWallet(
    booking.provider,
    booking.price,
    booking._id,
    booking.payment?.reference || "no_reference"
  );

  // Update booking status
  booking.status = "released";
  if (booking.payment) {
    booking.payment.escrowStatus = "released";
  }
  await booking.save();

  return booking;
};

/**
 * WITHDRAW FUNDS (unchanged)
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
 * VERIFY PAYMENT STATUS (unchanged)
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

    // 🔒 IDEMPOTENCY GUARD
    if (booking.payment.status === "paid") {
      return res.json({
        success: true,
        message: "Already verified",
        data: booking,
      });
    }

    // 🧠 STATE TRANSITION (CLEAN & CONSISTENT)
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

module.exports = {
  createBooking,
  getBookings,
  verifyPaymentStatus,
  initializePayment,
  holdPayment,
  releasePayment,
  markBookingCompleted,
  withdrawFunds,
  clientConfirmCompletion,   // ✅ new endpoint
};