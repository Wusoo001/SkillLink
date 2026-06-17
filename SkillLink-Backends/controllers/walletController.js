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

    // 1. Check bank details
    const user = await User.findById(providerId);
    if (!user.bankDetails || !user.bankDetails.verified) {
      return res.status(400).json({
        success: false,
        message: "Please set up your bank account before withdrawing."
      });
    }

    // 2. Debit wallet (using walletService.debitWallet)
    const wallet = await walletService.debitWallet(providerId, amount, "Withdrawal to bank");

    // 3. Create recipient on Paystack (if not exists)
    const recipientCode = await paystack.createRecipient(
      user.bankDetails.accountName,
      user.bankDetails.accountNumber,
      user.bankDetails.bankCode // you need to store bankCode as well
    );

    // 4. Initiate transfer
    const transfer = await paystack.initiateTransfer(amount, recipientCode);

    res.json({
      success: true,
      message: "Withdrawal initiated. Funds will be sent to your bank account.",
      data: transfer,
    });
  } catch (error) {
    console.error("Withdrawal error:", error);
    // If wallet was debited but transfer fails, you may need to reverse the debit.
    res.status(400).json({ success: false, message: error.message });
  }
};

module.exports = { getBalance, withdraw };