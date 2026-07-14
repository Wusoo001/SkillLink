const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const crypto = require('crypto');
const { sendVerificationEmail } = require('../services/emailService');

const router = express.Router();

// REGISTER
router.post("/register", async (req, res) => {
  const { name, email, phone, password } = req.body;

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.json({ success: false, message: "User already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate verification token
    const verificationToken = crypto.randomBytes(20).toString('hex');
    const verificationTokenExpires = Date.now() + 24 * 60 * 60 * 1000; // 24h

    const newUser = new User({
      name,
      email,
      phone,
      password: hashedPassword,
      verificationToken,
      verificationTokenExpires,
    });

    await newUser.save();

    // Send verification email (don't await – let it run in background)
    sendVerificationEmail(email, verificationToken)
      .catch(err => console.error("Email send error:", err));

    res.json({
      success: true,
      message: "User registered. Please verify your email.",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/verify/:token", async (req, res) => {
  try {
    const { token } = req.params;
    const user = await User.findOne({
      verificationToken: token,
      verificationTokenExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ success: false, message: "Invalid or expired token" });
    }

    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpires = undefined;
    await user.save();

    // Return a simple HTML response for browser
    res.send(`
      <html>
        <body style="font-family: Arial; text-align: center; padding: 50px;">
          <h1 style="color: #2563EB;">✅ Email Verified!</h1>
          <p>Your account has been activated. You can now log in to the app.</p>
          <a href="${process.env.BASE_URL}" style="color: #2563EB;">Go to App</a>
        </body>
      </html>
    `);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/resend-verification", async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.json({ success: false, message: "User not found" });
    if (user.isVerified)
      return res.json({ success: false, message: "Email already verified" });

    // Generate new token
    const verificationToken = crypto.randomBytes(20).toString('hex');
    const verificationTokenExpires = Date.now() + 24 * 60 * 60 * 1000;
    user.verificationToken = verificationToken;
    user.verificationTokenExpires = verificationTokenExpires;
    await user.save();

    await sendVerificationEmail(email, verificationToken);
    res.json({ success: true, message: "Verification email sent. Check your inbox." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// LOGIN
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user)
      return res.json({ success: false, message: "Invalid credentials" });

    if (!user.isVerified) {
      return res.json({
        success: false,
        message: "Please verify your email first. Check your inbox.",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.json({ success: false, message: "Invalid credentials" });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });

    const userResponse = {
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      bio: user.bio || "",
      profileImage: user.profileImage || "",
      rating: user.rating || 0,
      jobsCompleted: user.jobsCompleted || 0,
      skills: user.skills || [],
      location: user.location || "",
    };

    res.json({ success: true, token, user: userResponse });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});



module.exports = router;
