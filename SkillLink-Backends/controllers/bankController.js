const axios = require("axios");
const User = require("../models/User");

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;

// Get list of Nigerian banks from Paystack
const getBanks = async (req, res) => {
  try {
    const response = await axios.get("https://api.paystack.co/bank", {
      headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` },
      params: { country: "nigeria" },
    });
    return res.json(response.data);
  } catch (error) {
    console.error("Get banks error:", error.response?.data || error.message);
    res.status(500).json({ success: false, message: "Failed to fetch banks" });
  }
};

// Resolve account number
const resolveAccount = async (req, res) => {
  try {
    const { accountNumber, bankCode } = req.body;
    if (!accountNumber || !bankCode) {
      return res.status(400).json({ success: false, message: "Account number and bank code required" });
    }
    const response = await axios.get(
      `https://api.paystack.co/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`,
      { headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` } }
    );
    return res.json(response.data);
  } catch (error) {
    console.error("Resolve account error:", error.response?.data || error.message);
    res.status(500).json({ success: false, message: "Account verification failed" });
  }
};

// Save bank details (with verification)
const saveBankDetails = async (req, res) => {
  try {
    const { bankName, bankCode, accountNumber, accountName } = req.body;
    const userId = req.user._id;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    user.bankDetails = {
      bankName,
      bankCode,
      accountNumber,
      accountName,
      verified: true,
      updatedAt: new Date(),
    };
    await user.save();
    res.json({ success: true, message: "Bank details saved", data: user.bankDetails });
  } catch (error) {
    console.error("Save bank details error:", error);
    res.status(500).json({ success: false, message: "Failed to save bank details" });
  }
};
// Get current bank details
const getBankDetails = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("bankDetails");
    res.json({ success: true, data: user.bankDetails });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch bank details" });
  }
};

module.exports = { getBanks, resolveAccount, saveBankDetails, getBankDetails };