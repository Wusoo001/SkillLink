const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const userRoutes = require("./routes/users");
const webhookRoutes = require("./routes/webhookRoutes");
const bookingRoutes = require("./routes/bookingRoutes");
require("dotenv").config();
const walletRoutes = require("./routes/walletRoutes");


const app = express();

// Middleware
app.use(cors());
app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));


// Routes
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/posts", require("./routes/postRoutes"));
app.use("/api/users", userRoutes);
app.use("/api/webhooks", webhookRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/wallet", walletRoutes);


mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.log(err));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
