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
  console.log("💳 CREDITING WALLET");
  console.log("Provider:", providerId);
  console.log("Amount:", amount);
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
  console.log("✅ WALLET CREDITED");
  console.log("New Balance:", wallet.balance);

  return wallet;
};
const debitWallet = async (providerId, amount, description = "Withdrawal") => {
  const wallet = await Wallet.findOne({ provider: providerId });

  if (!wallet) {
    throw new Error("Wallet not found");
  }

  // prevent overdraft
  if (wallet.balance < amount) {
    throw new Error("Insufficient balance");
  }

  console.log("💸 DEBITING WALLET");
  console.log("Current Balance:", wallet.balance);

  wallet.balance -= amount;

  wallet.transactions.push({
    type: "debit",
    amount,
    description,
  });

  await wallet.save();

  console.log("✅ WALLET DEBITED");
  console.log("New Balance:", wallet.balance);

  return wallet;
};

/**
 * GET BALANCE for a provider
 */
const getBalance = async (providerId) => {
  const wallet = await Wallet.findOne({ provider: providerId });
  return wallet ? wallet.balance : 0;
};

module.exports = {
  getOrCreateWallet,
  creditWallet,
  debitWallet,
  getBalance,
};