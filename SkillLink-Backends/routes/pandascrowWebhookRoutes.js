const express = require("express");
const Booking = require("../models/Booking");
const pandascrowService = require("../services/pandascrowService");

const router = express.Router();

router.post("/", express.raw({ type: "application/json" }), async (req, res) => {
  let event;
  try {
    event = pandascrowService.verifyWebhook(
      req.body,
      req.get("x-pandascrow-signature")
    );
  } catch (err) {
    console.error("❌ Pandascrow webhook signature error:", err.message);
    return res.status(401).json({ status: false, message: err.message });
  }

    const { event: eventName, data } = event;

// Log the full payload once so you can see the exact shape of each event
    console.log("🔔 Pandascrow webhook:", eventName, JSON.stringify(data, null, 2));

    // Extract identifiers — different events carry different fields

    try {
        const bookingId = data?.metadata?.bookingId;
        const escrowId =
            data?.escrow_id ||
            data?.escrowId ||
            data?.id ||
            data?.escrow?.id;

        let booking = null;

        if (bookingId) {
            booking = await Booking.findById(bookingId);
        }

        // Fallback: match by pandascrowEscrowId (works for escrow.paid — no metadata)
        if (!booking && escrowId) {
            booking = await Booking.findOne({
            "payment.pandascrowEscrowId": String(escrowId),
            });
        }

        if (!booking) {
            console.warn("⚠️ Webhook: no booking found for", { bookingId, escrowId });
            return res.json({ status: true });
        }

        if (eventName === "escrow.paid" && booking.status === "awaiting_payment") {
            booking.status = "paid_in_escrow";
            booking.payment.status = "paid";
            booking.payment.escrowStatus = "funded";
            booking.payment.paidAt = new Date();
            await booking.save();
            console.log("✅ Booking → paid_in_escrow:", booking._id);
        }

        if (eventName === "escrow.completed" && booking.status !== "released") {
            booking.status = "released";
            booking.payment.escrowStatus = "released";
            booking.payment.releasedAt = new Date();
            await booking.save();
            console.log("✅ Booking → released:", booking._id);
        }

        return res.json({ status: true });
        } catch (err) {
        console.error("Pandascrow webhook processing error:", err);
        return res.status(500).json({ status: false });
        }
});

module.exports = router;