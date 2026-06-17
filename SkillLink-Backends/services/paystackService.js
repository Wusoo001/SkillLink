const axios = require("axios");
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

if (!PAYSTACK_SECRET_KEY) {
  console.warn("⚠️ PAYSTACK_SECRET_KEY is missing");
}

const PAYSTACK_BASE_URL = "https://api.paystack.co";

/**
 * Initialize payment (unchanged)
 */
const initializePayment = async ({ email, amount, reference }) => {
  try {
    const response = await axios.post(
      `${PAYSTACK_BASE_URL}/transaction/initialize`,
      {
        email,
        amount: amount * 100, // convert to kobo
        reference,
      },
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );
    return response.data.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Payment initialization failed"
    );
  }
};

/**
 * Verify payment (unchanged)
 */
const verifyPayment = async (reference) => {
  try {
    const response = await axios.get(
      `${PAYSTACK_BASE_URL}/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );
    return response.data.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Payment verification failed"
    );
  }
};

// ==============================
// NEW: Bank & Transfer Functions
// ==============================

/**
 * Get list of Nigerian banks
 */
const getBanks = async () => {
  try {
    const response = await axios.get(`${PAYSTACK_BASE_URL}/bank`, {
      headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` },
      params: { country: "nigeria" },
    });
    return response.data.data; // array of banks: { name, code, ... }
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Failed to fetch banks"
    );
  }
};

/**
 * Resolve account number – verify account name
 */
const resolveAccount = async (accountNumber, bankCode) => {
  try {
    const response = await axios.get(
      `${PAYSTACK_BASE_URL}/bank/resolve`,
      {
        headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` },
        params: { account_number: accountNumber, bank_code: bankCode },
      }
    );
    return response.data.data; // { account_name, ... }
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Account resolution failed"
    );
  }
};

/**
 * Create a transfer recipient (must be done before initiating transfer)
 */
const createRecipient = async (name, accountNumber, bankCode) => {
  try {
    const response = await axios.post(
      `${PAYSTACK_BASE_URL}/transferrecipient`,
      {
        type: "nuban",
        name,
        account_number: accountNumber,
        bank_code: bankCode,
        currency: "NGN",
      },
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );
    return response.data.data.recipient_code; // the recipient code
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Recipient creation failed"
    );
  }
};

/**
 * Initiate a transfer to a recipient
 * amount is in Naira (will be converted to kobo automatically)
 */
const initiateTransfer = async (amount, recipientCode, reason = "SkillLink withdrawal") => {
  try {
    const response = await axios.post(
      `${PAYSTACK_BASE_URL}/transfer`,
      {
        source: "balance",
        amount: amount * 100, // Paystack uses kobo
        recipient: recipientCode,
        reason,
      },
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );
    return response.data.data; // transfer details
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Transfer initiation failed"
    );
  }
};

module.exports = {
  initializePayment,
  verifyPayment,
  getBanks,
  resolveAccount,
  createRecipient,
  initiateTransfer,
};