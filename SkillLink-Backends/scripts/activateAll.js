/**
 * One-shot: activate all circles.
 * Run this after Path A switch — every user sees only their own LGA circle,
 * so no need for arbitrary "5 launch LGAs" anymore.
 *
 * Usage:  node scripts/activateAll.js
 * Idempotent — safe to re-run.
 */

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
const mongoose = require("mongoose");
const Circle = require("../models/Circle");

async function activateAll() {
  try {
    if (!process.env.MONGO_URI) {
      console.error("❌ MONGO_URI not set in .env");
      process.exit(1);
    }

    console.log("🔄 Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected\n");

    const before = await Circle.countDocuments({ status: "coming_soon" });
    const beforeActive = await Circle.countDocuments({ status: "active" });
    console.log(`📊 Before — active: ${beforeActive} · coming_soon: ${before}`);

    const result = await Circle.updateMany(
      { status: "coming_soon" },
      { $set: { status: "active" } }
    );

    const afterActive = await Circle.countDocuments({ status: "active" });
    const total = await Circle.countDocuments();

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`✅ Activated: ${result.modifiedCount} circles`);
    console.log(`📊 After — active: ${afterActive} / ${total}`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    await mongoose.disconnect();
    console.log("✅ Done.");
    process.exit(0);
  } catch (err) {
    console.error("❌ Activate error:", err.message);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
  }
}

activateAll();