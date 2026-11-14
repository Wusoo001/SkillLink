/**
 * Seeds all 774 LGA circles as 'coming_soon'.
 * Activation is a separate step — see scripts/activateCircles.js.
 *
 * Usage:  node scripts/seedCircles.js
 * Idempotent — safe to re-run (skips existing).
 */

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
const mongoose = require("mongoose");
const Circle = require("../models/Circle");
const { nigeriaStates } = require("../nigeriaStates.data");

async function seed() {
  try {
    if (!process.env.MONGO_URI) {
      console.error("❌ MONGO_URI not set in .env");
      process.exit(1);
    }

    console.log("🔄 Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected\n");

    let created = 0;
    let skipped = 0;

    for (const state of nigeriaStates) {
      for (const lga of state.lgas) {
        const exists = await Circle.findOne({ state: state.name, lga });
        if (exists) {
          skipped++;
          continue;
        }
        await Circle.create({
          name: `${lga}, ${state.name}`,
          state: state.name,
          lga,
          status: "coming_soon",
        });
        created++;
      }
    }

    const activeCount = await Circle.countDocuments({ status: "active" });
    const totalCount = await Circle.countDocuments();

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`✅ Created:  ${created} circles`);
    console.log(`⏭️  Skipped:  ${skipped} (already existed)`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`📊 Total circles:  ${totalCount}`);
    console.log(`📊 Active circles: ${activeCount} (expected 0)`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
    console.log("💡 To activate circles later, run:");
    console.log("   node scripts/activateCircles.js Lagos Ikeja Lekki Yaba\n");

    await mongoose.disconnect();
    console.log("✅ Done.");
    process.exit(0);
  } catch (err) {
    console.error("❌ Seed error:", err.message);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
  }
}

seed();