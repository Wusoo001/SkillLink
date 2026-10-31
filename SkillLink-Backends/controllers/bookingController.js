const axios = require("axios");
const Booking = require("../models/Booking");
const User = require("../models/User");          // ← ADDED
const walletService = require("../services/walletService");
const notificationController = require("./notificationController"); // ← ADDED
const pandascrowService = require("../services/pandascrowService");

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
    if (String(req.body.client) === String(req.body.provider)) {
      return res.status(400).json({
        success: false,
        message: "You cannot book your own service.",
      });
    }
    const booking = await Booking.create(req.body);

    // ===== CREATE NOTIFICATION FOR PROVIDER =====
    try {
      const provider = await User.findById(req.body.provider);
      if (provider) {
        await notificationController.createNotification(
          req.body.provider,
          "booking_request",
          "New Booking Request",
          `${req.user?.name || "A client"} wants to book your service: ${req.body.serviceTitle}`,
          {
            bookingId: booking._id,
            clientId: req.user._id,
            providerId: req.body.provider,
          }
        );
        console.log("✅ Notification created for provider:", req.body.provider);
      } else {
        console.log("❌ Provider not found for notification");
      }
    } catch (notifError) {
      console.error("❌ Notification creation error:", notifError.message);
      // Don't fail the booking if notification fails
    }

    res.status(201).json({
      success: true,
      data: booking,
    });
  } catch (error) {
    console.error("❌ Error in createBooking:", error);
    res.status(500).json({
      success: false,
      message: error.message,
      stack: error.stack,
    });
  }
};

/**
 * GET USER BOOKINGS
 */
const getBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({
      $or: [{ client: req.user._id }, { provider: req.user._id }],
    })
      .populate("client", "name profileImage")
      .populate("provider", "name profileImage");
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
 * GET /bookings/by-reference/:reference
 * Returns a booking by its Pandascrow reference (skilllink_<bookingId>).
 * Used by the mobile "Confirm Payment" button to poll for webhook confirmation
 * instead of querying Pandascrow's API directly.
 * Access restricted to the booking's client or provider.
 */
const getBookingByReference = async (req, res) => {
  try {
    const { reference } = req.params;
    console.log("🔍 [by-reference] Looking up:", reference);

    const booking = await Booking.findOne({
      "payment.pandascrowReference": reference,
    })
      .populate("client", "name profileImage")
      .populate("provider", "name profileImage");
      console.log("🔍 [by-reference] Found:", booking ? booking._id : "NOT FOUND");   // ← ADD
      console.log("🔍 [by-reference] Status:", booking?.status);

    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    const isClient = String(booking.client?._id || booking.client) === String(req.user._id);
    const isProvider = String(booking.provider?._id || booking.provider) === String(req.user._id);

    if (!isClient && !isProvider) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    return res.json({ success: true, data: booking });
  } catch (error) {
    console.error("Get booking by reference error:", error.message);
    return res.status(500).json({ success: false, message: error.message });
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

    // ===== NOTIFICATION FOR CLIENT =====
    try {
      const client = await User.findById(booking.client);
      if (client) {
        await notificationController.createNotification(
          booking.client,
          "booking_accepted",
          "Booking Accepted",
          `${req.user.name} has accepted your booking for: ${booking.serviceTitle}`,
          {
            bookingId: booking._id,
            clientId: booking.client,
            providerId: req.user._id,
          }
        );
      }
    } catch (notifError) {
      console.error("❌ Notification error (accept):", notifError.message);
    }

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

    // ===== NOTIFICATION FOR CLIENT =====
    try {
      const client = await User.findById(booking.client);
      if (client) {
        await notificationController.createNotification(
          booking.client,
          "booking_rejected",
          "Booking Declined",
          `${req.user.name} has declined your booking for: ${booking.serviceTitle}`,
          {
            bookingId: booking._id,
            clientId: booking.client,
            providerId: req.user._id,
          }
        );
      }
    } catch (notifError) {
      console.error("❌ Notification error (reject):", notifError.message);
    }

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
      console.log("Booking not found");
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

    // ===== NOTIFICATION FOR PROVIDER =====
    try {
      const provider = await User.findById(booking.provider);
      if (provider) {
        await notificationController.createNotification(
          booking.provider,
          "booking_cancelled",
          "Booking Cancelled",
          `${req.user.name} has cancelled their booking for: ${booking.serviceTitle}`,
          {
            bookingId: booking._id,
            clientId: req.user._id,
            providerId: booking.provider,
          }
        );
      }
    } catch (notifError) {
      console.error("❌ Notification error (cancel):", notifError.message);
    }

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
//  PAYMENT & ESCROW
// ======================================================

/**
 * INITIATE PAYMENT (PANDASCROW)
 */
const initializePayment = async (req, res) => {
  try {
    const { bookingId } = req.body;
    const booking = await Booking.findById(bookingId)
      .populate("client", "name email phone")
      .populate("provider", "name email phone bankDetails");

    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    if (!booking.provider?.email) {
      return res.status(400).json({ success: false, message: "Provider has no email on file" });
    }

    if (!booking.provider?.bankDetails?.accountNumber) {
      return res.status(400).json({
        success: false,
        message: "Provider has not set up bank details. Ask them to complete Bank Setup.",
      });
    }

    if (Number(booking.price) <= 0) {
      return res.status(400).json({ success: false, message: "Invalid booking price" });
    }

    // Idempotency — return existing escrow if already created
    if (booking.payment?.pandascrowPaymentUrl) {
      return res.json({
        success: true,
        checkout_url: booking.payment.pandascrowPaymentUrl,
        reference: booking.payment.pandascrowReference,
      });
    }

    const escrow = await pandascrowService.initiateEscrow(booking, {
      useVirtualAccount: false, // set true for NGN bank-transfer checkout
    });

    // Pandascrow returns payment_url for payment_link, or account details for virtual_account
    const paymentUrl = escrow.payment_url || escrow.checkout_url || escrow.authorization_url;

    booking.payment = {
      ...booking.payment,
      pandascrowEscrowId: String(escrow.escrow_id || escrow.id),
      pandascrowPaymentUrl: paymentUrl,
      pandascrowReference: `skilllink_${booking._id}`,
      status: "pending",
    };
    booking.status = "awaiting_payment";
    await booking.save();

    return res.json({
      success: true,
      checkout_url: paymentUrl,
      reference: booking.payment.pandascrowReference,
      escrow_id: booking.payment.pandascrowEscrowId,
    });
  } catch (error) {
    console.error("Pandascrow initiate error:", error.message);
    res.status(500).json({ success: false, message: error.message });
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


/**
 * MARK BOOKING AS COMPLETED (PROVIDER)
 */
const markBookingCompleted = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    if (booking.status !== "paid_in_escrow") {
      return res.status(400).json({
        success: false,
        message: "Funds must be in escrow before marking complete",
      });
    }

    if (!booking.payment?.pandascrowEscrowId) {
      return res.status(400).json({
        success: false,
        message: "No Pandascrow escrow ID on this booking",
      });
    }

    // Pandascrow has no separate "deliver" call — completion happens on release.
    // We just record the provider's completion on our side.
    booking.status = "completed";
    await booking.save();

    res.json({
      success: true,
      message: "Job marked as completed. Waiting for client confirmation.",
      data: booking,
    });
  } catch (error) {
    console.error("Mark completed error:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * CLIENT CONFIRMS COMPLETION → TRIGGER FUND RELEASE
 */
const clientConfirmCompletion = async (req, res) => {
  console.log("📥 [confirm] Request received for:", req.params.id);
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    if (booking.status !== "completed") {
      return res.status(400).json({
        success: false,
        message: "Job not yet marked as completed by provider",
      });
    }

    if (!booking.payment?.pandascrowEscrowId) {
      return res.status(400).json({
        success: false,
        message: "No Pandascrow escrow ID on this booking",
      });
    }

    const { otp } = req.body || {};

    // Step 1 — no OTP provided → trigger OTP send + tell client to check email
    if (!otp) {
      console.log("🔍 [confirm] No OTP — requesting OTP from Pandascrow...");
      await pandascrowService.resendReleaseOtp(booking.payment.pandascrowEscrowId);
      console.log("✅ [confirm] OTP sent to buyer's email");
      return res.status(202).json({
        success: false,
        requires_otp: true,
        message:
          "Pandascrow sent a release OTP to the client's email. Enter the code to complete release.",
      });
    }

    // Step 2 — OTP provided → complete the release
    console.log("🔍 [confirm] OTP provided — attempting release...");
    await pandascrowService.releaseEscrow(booking.payment.pandascrowEscrowId, otp);

    booking.status = "released";
    booking.payment.escrowStatus = "released";
    booking.payment.releasedAt = new Date();
    await booking.save();
    console.log("✅ [confirm] Booking released:", booking._id);

    res.json({
      success: true,
      message: "Funds released to provider.",
      data: booking,
    });
  } catch (error) {
    console.error("❌ [confirm] Release error:", error.message);
    res.status(500).json({ success: false, message: error.message });
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


// ======================================================
//  REVIEW BOOKING
// ======================================================
const reviewBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, comment } = req.body;
    const clientId = req.user._id;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: "Rating must be between 1 and 5",
      });
    }

    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    if (booking.status !== "released") {
      return res.status(400).json({
        success: false,
        message: "You can only review completed jobs after funds are released",
      });
    }

    if (booking.client.toString() !== clientId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Only the client can review this booking",
      });
    }

    if (booking.reviewed === true) {
      return res.status(400).json({
        success: false,
        message: "This booking has already been reviewed",
      });
    }

    const Review = require("../models/Review");
    const existing = await Review.findOne({ booking: id });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: "A review already exists for this booking",
      });
    }

    if (!booking.post) {
      return res.status(400).json({
        success: false,
        message: "This booking is not associated with a specific post, cannot review",
      });
    }

    const review = await Review.create({
      booking: id,
      client: booking.client,
      provider: booking.provider,
      post: booking.post,
      rating: Number(rating),
      comment: comment || "",
    });

    booking.reviewed = true;
    await booking.save();

    const allReviews = await Review.find({ provider: booking.provider });
    const totalRatings = allReviews.reduce((sum, r) => sum + r.rating, 0);
    const avgRating = totalRatings / allReviews.length;
    await User.findByIdAndUpdate(booking.provider, {
      rating: Math.round(avgRating * 10) / 10,
    });

    res.json({
      success: true,
      message: "Review posted successfully",
      data: review,
    });
  } catch (error) {
    console.error("Review error:", error.message);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to post review",
    });
  }
};

/**
 * GET /bookings/by-escrow-id/:escrowId
 * Find a booking by Pandascrow escrow ID (e.g. 4060).
 * Used by PaymentReturnScreen after Pandascrow redirects the user back.
 */
const getBookingByEscrowId = async (req, res) => {
  try {
    const { escrowId } = req.params;
    const booking = await Booking.findOne({
      "payment.pandascrowEscrowId": String(escrowId),
    })
      .populate("client", "name profileImage")
      .populate("provider", "name profileImage");

    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    const isClient = String(booking.client?._id || booking.client) === String(req.user._id);
    const isProvider = String(booking.provider?._id || booking.provider) === String(req.user._id);
    if (!isClient && !isProvider) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    return res.json({ success: true, data: booking });
  } catch (error) {
    console.error("Get booking by escrow ID error:", error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ======================================================
//  EXPORTS
// ======================================================
module.exports = {
  createBooking,
  getBookings,
  getBookingById,
  getBookingByReference, 
  getBookingByEscrowId,
  acceptBooking,
  rejectBooking,
  cancelBookingRequest,
  initializePayment,
  holdPayment,
  markBookingCompleted,
  withdrawFunds,
  clientConfirmCompletion,
  reviewBooking, // ← ADD THIS
};