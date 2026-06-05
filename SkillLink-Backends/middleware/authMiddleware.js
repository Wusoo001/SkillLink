const jwt = require("jsonwebtoken");
const User = require("../models/User");

const protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    token = req.headers.authorization.split(" ")[1];
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log("🔐 Decoded token:", decoded); // 👈 check backend console
      // Your login uses { id: user._id }, so we use decoded.id
      const userId = decoded.id || decoded.userId;
      if (!userId) throw new Error("No user ID in token");
      req.user = await User.findById(userId).select("-password");
      if (!req.user) throw new Error("User not found");
      console.log("✅ Authenticated user:", req.user.email);
      next();
    } catch (error) {
      console.log("❌ Auth error:", error.message);
      return res.status(401).json({ message: "Not authorized" });
    }
  }
  if (!token) {
    console.log("❌ No token in headers");
    return res.status(401).json({ message: "No token provided" });
  }
};

module.exports = protect;