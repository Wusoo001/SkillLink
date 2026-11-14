/**
 * Activate circles for launch.
 * Usage:   node scripts/activateCircles.js <State> <LGA1> <LGA2> ...
 * Example: node scripts/activateCircles.js Lagos Ikeja Lekki Yaba
 * Idempotent — safe to re-run.
 */

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
const mongoose = require("mongoose");
const Circle = require("../models/Circle");

async function activate() {
  try {
    const args = process.argv.slice(2);
    if (args.length < 2) {
      console.error("❌ Usage: node scripts/activateCircles.js <State> <LGA1> <LGA2> ...");
      console.error("   Example: node scripts/activateCircles.js Lagos Ikeja Lekki Yaba");
      process.exit(1);
    }

    const state = args[0];
    const lgas = args.slice(1);

    if (!process.env.MONGO_URI) {
      console.error("❌ MONGO_URI not set in .env");
      process.exit(1);
    }

    console.log(`🔄 Activating ${lgas.length} circle(s) in ${state}...\n`);
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected\n");

    let activated = 0;
    let notFound = [];
    let alreadyActive = 0;

    for (const lga of lgas) {
      const circle = await Circle.findOne({ state, lga });
      if (!circle) {
        notFound.push(lga);
        continue;
      }
      if (circle.status === "active") {
        alreadyActive++;
        console.log(`⏭️  ${lga} — already active`);
        continue;
      }
      circle.status = "active";
      await circle.save();
      activated++;
      console.log(`🔥 ${lga} — activated`);
    }

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`✅ Activated:      ${activated}`);
    console.log(`⏭️  Already active: ${alreadyActive}`);
    if (notFound.length > 0) {
      console.log(`⚠️  Not found:      ${notFound.join(", ")}`);
    }
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    const actives = await Circle.find({ status: "active" }).sort({ name: 1 });
    console.log(`📊 Total active circles: ${actives.length}`);
    actives.forEach((c) => console.log(`  • ${c.name}`));

    await mongoose.disconnect();
    console.log("\n✅ Done.");
    process.exit(0);
  } catch (err) {
    console.error("❌ Activate error:", err.message);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
  }
}

activate();