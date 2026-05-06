const Booking = require("../models/Booking");

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
  const booking = await Booking.findById(bookingId);

  if (!booking) throw new Error("Booking not found");

  // prevent double release
  if (booking.payment?.escrowStatus === "released") {
    return booking;
  }

  booking.status = "released";

  booking.payment.escrowHeld = false;
  booking.payment.escrowStatus = "released";
  booking.payment.releasedAt = new Date();

  await booking.save();

  return booking;
};

module.exports = {
  holdFunds,
  releaseFunds,
};