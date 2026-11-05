const crypto = require("crypto");
const { Pandascrow } = require("pandascrow");
const { v4: uuidv4 } = require('uuid');

// SDK defaults to sandbox when no { sandbox: false } option is passed.
// Remove the option entirely for production later.
const ps = new Pandascrow(process.env.PANDASCROW_API_KEY);

/**
 * Pandascrow requires a "uuid" — the Pandascrow user acting on the escrow.
 * For a marketplace/broker model, this should be the PLATFORM's Pandascrow user.
 * Store it in .env as PANDASCROW_PLATFORM_UUID.
 */
const PLATFORM_UUID = process.env.PANDASCROW_PLATFORM_UUID;

const PLATFORM_COMMISSION_PERCENT =
  Number(process.env.PLATFORM_COMMISSION_PERCENT) || 5;

/**
 * Format a Date as YYYY-MM-DD for Pandascrow's delivery_date field.
 */
const toDateString = (date) => {
  const d = new Date(date);
  return d.toISOString().split("T")[0];
};

/**
 * Create a one-time escrow for a booking.
 *
 * @param {Object} booking - Populated Booking (client + provider with bankDetails)
 * @param {Object} options - { useVirtualAccount: boolean }
 * @returns {Promise<Object>} escrow object including payment_url / escrow_id
 */
const initiateEscrow = async (booking, options = {}) => {
  const provider = booking.provider;

  if (!provider?.bankDetails?.accountNumber || !provider?.bankDetails?.bankCode) {
    throw new Error(
      "Provider has no verified bank details. Ask them to complete Bank Setup before accepting payment."
    );
  }

  const reference = `skilllink_${booking._id}`;

  const payload = {
    // --- Identity ---
    uuid: PLATFORM_UUID,
    escrow_type: "onetime",

    // ✅ Platform is the initiator with the "broker" role.
    // This makes the platform a participant with release authority,
    // so ps.escrow.complete(PLATFORM_UUID, escrowId) is authorized.
    initiator_role: "broker",
    initiator_id: PLATFORM_UUID,
    receiver_id: booking.provider._id.toString(),

    // --- Service details ---
    title: booking.serviceTitle,
    description: booking.description || booking.serviceTitle,
    acceptance_criteria:
      "Client confirms the service was delivered as described in the booking.",
    currency: "NGN",
    amount: Number(booking.price),

    // --- Timeline ---
    inspection_period: "3",        // days buyer has to inspect after delivery
    no_reviews: "2",               // revision rounds allowed
    delivery_date: toDateString(booking.scheduledDate),
    dispute_window: "5",           // days to open dispute after delivery

    // --- Policy ---
    how_dispute_is_handled: "arbitration",
    who_pay_fees: "seller", // Pandascrow fee deducted from provider's side
    partner_escrow_fee: PLATFORM_COMMISSION_PERCENT,

    // --- Parties ---
    buyer_details: {
      name: booking.client.name,
      email: booking.client.email,
      phone: booking.client.phone || "+2348000000000",
    },
    seller_details: {
      name: provider.name,
      email: provider.email,
      phone: provider.phone || "+2348000000000",
    },

    // --- Payout destination (provider's bank) ---
    payout: {
      payout_type: "bank",
      bank_name: provider.bankDetails.bankName,
      bank_code: provider.bankDetails.bankCode,
      account_number: provider.bankDetails.accountNumber,
      account_name: provider.bankDetails.accountName,
    },

    // --- Redirect ---
    callback_url: process.env.PANDASCROW_RETURN_URL,

    // --- Your own IDs (returned in webhooks) ---
    metadata: {
      bookingId: booking._id.toString(),
      attemptAt: Date.now(),
    },
  };

  // Optional: bank-transfer via 9PSB virtual account (NGN only)
  if (options.useVirtualAccount) {
    payload.payment_gateway = "virtual_account";
    payload.expiry_hours = 24;
  }

  // ✅ Idempotency key must be passed as the second argument, NOT in the payload.
  const escrow = await ps.escrow.createOnetime(payload, {
    idempotencyKey: uuidv4(),
  });
  return escrow;
};

/**
 * Fetch escrow by Pandascrow escrow_id.
 */
const getEscrow = async (escrowId) => {
  return await ps.escrow.find(process.env.PANDASCROW_PLATFORM_UUID, escrowId);
};

/**
 * Release funds to the provider (seller).
 * ✅ SDK signature: ps.escrow.complete(uuid, escrowId, otp?)
 * Pandascrow may require an OTP sent to the buyer.
 */
const releaseEscrow = async (escrowId, otp = null) => {
  const uuid = process.env.PANDASCROW_PLATFORM_UUID;
  if (!uuid) throw new Error("PANDASCROW_PLATFORM_UUID not set");

  // SDK strictly requires OTP — no two-argument form exists
  if (!otp) {
    throw new Error("OTP_REQUIRED");
  }

  console.log("🔍 [releaseEscrow] Calling SDK complete with OTP...");
  const result = await ps.escrow.complete(uuid, escrowId, otp);
  console.log("🔍 [releaseEscrow] SDK call returned:", result?.status || "ok");
  return result;
};

/**
 * Ask Pandascrow to email/SMS a fresh release OTP to the buyer.
 * ✅ SDK signature: ps.escrow.resendReleaseOtp(uuid, escrowId)
 */
const resendReleaseOtp = async (escrowId) => {
  const uuid = process.env.PANDASCROW_PLATFORM_UUID;
  if (!uuid) throw new Error("PANDASCROW_PLATFORM_UUID not set");
  return await ps.escrow.resendReleaseOtp(uuid, escrowId);
};

/**
 * Verify a Pandascrow webhook signature.
 * Pandascrow signs the RAW BODY with HMAC-SHA256 using your secret key.
 */
const verifyWebhook = (rawBody, signature) => {
  const secret = process.env.PANDASCROW_SECRET_KEY;
  if (!secret) throw new Error("PANDASCROW_SECRET_KEY not set");

  const rawStr = Buffer.isBuffer(rawBody) ? rawBody.toString("utf8") : rawBody;
  const event = JSON.parse(rawStr);

  if (!event?.event || !event?.data) {
    throw new Error("Invalid webhook payload structure");
  }

  // ✅ Sign the RAW BODY directly — Pandascrow includes "id" and preserves property order
  const expected = crypto
    .createHmac("sha256", secret)
    .update(rawStr, "utf8")
    .digest("hex");

  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signature || "", "utf8");
  if (a.length !== b.length) throw new Error("Invalid signature length");
  if (!crypto.timingSafeEqual(a, b)) throw new Error("Invalid signature");

  return event;
};

module.exports = {
  initiateEscrow,
  getEscrow,
  releaseEscrow,
  resendReleaseOtp,
  verifyWebhook,
};