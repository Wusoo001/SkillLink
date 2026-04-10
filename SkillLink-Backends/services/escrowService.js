const Booking = require("../models/Booking");

const holdFunds = async (bookingId, reference) => {
  const booking = await Booking.findById(bookingId);

  if (!booking) throw new Error("Booking not found");

  booking.status = "paid_in_escrow";
  booking.payment.escrowHeld = true;
  booking.payment.reference = reference;
  booking.payment.paidAt = new Date();

  await booking.save();

  return booking;
};

const releaseFunds = async (bookingId) => {
  const booking = await Booking.findById(bookingId);

  if (!booking) throw new Error("Booking not found");

  booking.status = "released";
  booking.payment.escrowHeld = false;
  booking.payment.releasedAt = new Date();

  await booking.save();

  return booking;
};

module.exports = {
  holdFunds,
  releaseFunds,
};