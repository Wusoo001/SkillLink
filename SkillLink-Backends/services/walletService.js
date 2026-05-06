const Wallet = require("../models/Wallet");

/**
 * Ensure wallet exists
 */
const getOrCreateWallet = async (providerId) => {
  let wallet = await Wallet.findOne({ provider: providerId });

  if (!wallet) {
    wallet = await Wallet.create({
      provider: providerId,
    });
  }

  return wallet;
};

/**
 * CREDIT WALLET (used when escrow is released)
 */
const creditWallet = async (providerId, amount, bookingId, reference) => {
  const wallet = await getOrCreateWallet(providerId);

  wallet.balance += amount;
  wallet.totalEarned += amount;

  wallet.transactions.push({
    type: "credit",
    amount,
    reference,
    bookingId,
    description: "Escrow release payment",
  });

  await wallet.save();

  return wallet;
};

module.exports = {
  getOrCreateWallet,
  creditWallet,
};