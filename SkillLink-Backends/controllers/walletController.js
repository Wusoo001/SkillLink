const walletService = require("../services/walletService");

/**
 * GET /api/wallet/balance
 */
const getBalance = async (req, res) => {
  try {
    const providerId = req.user._id;
    const balance = await walletService.getBalance(providerId);
    res.json({ success: true, balance });
  } catch (error) {
    console.error("Balance error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/wallet/withdraw
 */
const withdraw = async (req, res) => {
  try {
    const { amount } = req.body;
    const providerId = req.user._id;

    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: "Invalid amount" });
    }

    const wallet = await walletService.debitWallet(providerId, amount, "Provider withdrawal");

    res.json({
      success: true,
      message: "Withdrawal successful",
      data: wallet,
    });
  } catch (error) {
    console.error("Withdrawal error:", error.message);
    res.status(400).json({ success: false, message: error.message });
  }
};

module.exports = { getBalance, withdraw };