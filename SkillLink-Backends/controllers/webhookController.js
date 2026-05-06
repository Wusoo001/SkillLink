const crypto = require("crypto");
const Booking = require("../models/Booking");
const escrowService = require("../services/escrowService");

/**
 * Verify Paystack signature
 */
const verifySignature = (req) => {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!req.rawBody) {
    console.log("❌ Missing rawBody");
    return false;
  }

  const hash = crypto
    .createHmac("sha512", secret)
    .update(req.rawBody)
    .digest("hex");

  return hash === req.headers["x-paystack-signature"];
};

/**
 * PAYSTACK WEBHOOK CONTROLLER
 */
const handlePaystackWebhook = async (req, res) => {
  console.log("🚀 CONTROLLER EXECUTING");
  
  try {
    // 1. SECURITY CHECK
    if (!verifySignature(req)) {
      return res.status(401).send("Invalid signature");
    }

    const event = req.body;

    // 2. HANDLE ONLY SUCCESSFUL PAYMENT
    if (event.event === "charge.success") {
      const reference = event.data.reference;
      console.log("EVENT TYPE:", event.event);
      console.log("REFERENCE:", reference);

      // 🔥 ADD DEBUG BLOCK RIGHT HERE
      console.log("LOOKING UP BOOKING FOR:", reference);

      // 3. FIND BOOKING
      const booking = await Booking.findOne({
        "payment.reference": reference,
      });
      console.log("BOOKING FOUND:", !!booking);

      if (!booking) {
        return res.status(404).send("Booking not found");
      }

      // 4. IDEMPOTENCY CHECK (PREVENT DOUBLE PROCESSING)
      if (booking.status === "paid_in_escrow") {
        return res.status(200).send("Already processed");
      }

      if (booking.payment?.escrowHeld === true) {
        return res.status(200).send("Already processed");
      }
      
      console.log("ABOUT TO TRIGGER ESCROW...");
      // 5. UPDATE + TRIGGER ESCROW (ATOMIC FLOW)
      await escrowService.holdFunds(booking._id, reference);

      return res.status(200).send("Webhook processed successfully");
    }

    // 6. IGNORE OTHER EVENTS SAFELY
    return res.status(200).send("Event ignored");
  } catch (error) {
    console.error("Webhook error:", error.message);
    return res.status(500).send("Internal server error");
  }
};

module.exports = {
  handlePaystackWebhook,
};