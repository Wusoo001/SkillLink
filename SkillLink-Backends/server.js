require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const userRoutes = require("./routes/users");
const webhookRoutes = require("./routes/webhookRoutes");
const bookingRoutes = require("./routes/bookingRoutes");
console.log("🔍 bookingRoutes loaded:", bookingRoutes);
const walletRoutes = require("./routes/walletRoutes");
const bankRoutes = require("./routes/bankRoutes");
const notificationRoutes = require("./routes/notificationRoutes");



const app = express();

// Middleware
app.use(cors());
app.use("/api/webhooks/pandascrow", require("./routes/pandascrowWebhookRoutes"));
app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));

// ============================================================
// PAYMENT RETURN PAGE
// Pandascrow redirects the user here after payment.
// This page then forwards them to the app (env-driven URL).
// ============================================================
app.get("/payment-return", (req, res) => {
  const ref = req.query.ref || "";
  const frontendUrl =
    process.env.FRONTEND_RETURN_URL || "http://192.168.1.215:8081/payment-return";
  const target = `${frontendUrl}${frontendUrl.includes("?") ? "&" : "?"}ref=${encodeURIComponent(ref)}`;

  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Payment Received</title>
        <meta http-equiv="refresh" content="1;url=${target}" />
        <style>
          body { font-family: -apple-system, sans-serif; background: #F9F8FC; color: #0F0B1A;
                 display: flex; align-items: center; justify-content: center; min-height: 100vh;
                 margin: 0; padding: 20px; }
          .card { background: white; border: 1px solid #E4DEF5; border-radius: 20px;
                  padding: 32px 24px; max-width: 400px; text-align: center;
                  box-shadow: 0 8px 24px rgba(91, 60, 196, 0.06); }
          .icon { font-size: 44px; margin-bottom: 16px; }
          h1 { font-size: 22px; margin: 0 0 8px; font-weight: 800; }
          p { font-size: 14px; color: #8A8499; margin: 0 0 20px; line-height: 1.5; }
          .btn { display: inline-block; background: #5B3CC4; color: white;
                 padding: 14px 24px; border-radius: 14px; text-decoration: none;
                 font-weight: 700; font-size: 15px; width: 100%; box-sizing: border-box; }
          .ref { font-size: 11px; color: #8A8499; margin-top: 16px; font-family: monospace; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="icon">✅</div>
          <h1>Payment Received</h1>
          <p>Your payment is safely held in escrow. Returning you to the app...</p>
          <a class="btn" href="${target}">Return to App</a>
          <p class="ref">Ref: ${ref || "—"}</p>
        </div>
      </body>
    </html>
  `);
});
// Routes
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/posts", require("./routes/postRoutes"));
app.use("/api/users", userRoutes);
app.use("/api/webhooks", webhookRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/wallet", walletRoutes);
app.use("/api/bank", bankRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/reports", require("./routes/reportRoutes"));
app.use("/api/chat", require("./routes/chatRoutes"));
app.use("/api/admin", require("./routes/adminRoutes"));
// Add after existing routes:
app.use("/api/appeals", require("./routes/appealRoutes"));

// 🔧 DEBUG ROUTE – remove after testing
app.get("/test", (req, res) => {
  res.json({ success: true, message: "Server is running" });
});
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.log(err));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
