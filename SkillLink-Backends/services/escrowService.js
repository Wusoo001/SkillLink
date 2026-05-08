const Booking = require("../models/Booking");
const Wallet = require("../models/Wallet");
const walletService = require("./walletService");

const holdFunds = async (bookingId, reference) => {
  console.log("💰 ESCROW TRIGGERED");
  console.log("Booking ID:", bookingId);
  console.log("Reference:", reference);
  const booking = await Booking.findById(bookingId);

  if (!booking) throw new Error("Booking not found");

  // prevent double escrow
  if (booking.payment?.escrowHeld) {
    return booking;
  }

  booking.status = "paid_in_escrow";

  booking.payment.reference = reference;
  booking.payment.status = "success";
  booking.payment.escrowHeld = true;
  booking.payment.escrowStatus = "held";
  booking.payment.paidAt = new Date();

  await booking.save();

  return booking;
};

const releaseFunds = async (bookingId) => {
  console.log("🔓 RELEASE FUNCTION TRIGGERED");
  console.log("Booking ID:", bookingId);

  const booking = await Booking.findById(bookingId);

  if (!booking) throw new Error("Booking not found");

  // ❌ Prevent release if not in escrow
  if (booking.status !== "completed") {
  throw new Error("Booking must be completed before release");
  }

  // ✅ Prevent double release
  if (booking.payment?.escrowStatus === "released") {
    console.log("⚠️ Already released");
    return booking;
  }
   // 🔥 WALLET CREDIT (NEW CORE INTEGRATION)
  await walletService.creditWallet(
    booking.provider,
    booking.price,
    booking._id,
    booking.payment.reference
  );

  // ✅ Update state
  booking.status = "released";

  booking.payment.escrowHeld = false;
  booking.payment.escrowStatus = "released";
  booking.payment.releasedAt = new Date();

  await booking.save();

  console.log("✅ FUNDS RELEASED");

  return booking;
};

module.exports = {
  holdFunds,
  releaseFunds,
};