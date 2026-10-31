const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const adminOnly = require("../middleware/adminMiddleware");
const adminController = require("../controllers/adminController");
const appealController = require("../controllers/appealController");
// All admin routes require auth + admin email
router.use(protect, adminOnly);

// Stats
router.get("/stats", adminController.getStats);
router.get("/stats/chart", adminController.getStatsChart);

// Users
router.get("/users", adminController.listUsers);
router.get("/users/:id", adminController.getUserDetail);
router.put("/users/:id/verify", adminController.toggleUserVerification);
router.delete("/users/:id", adminController.deleteUser);
router.post("/users/:id/action", adminController.takeUserAction);

// Posts
router.get("/posts", adminController.listPosts);
router.delete("/posts/:id", adminController.deletePost);

// Bookings
router.get("/bookings", adminController.listBookings);

// Reports
router.get("/reports", adminController.listReports);
router.put("/reports/:id/status", adminController.updateReportStatus);
router.post("/reports/:id/action", adminController.takeReportAction);

// Reviews
router.get("/reviews", adminController.listReviews);
router.delete("/reviews/:id", adminController.deleteReview);

// Transactions
router.get("/transactions", adminController.listTransactions);

// Appeal
router.get("/appeals", appealController.listAppeals);
router.put("/appeals/:id/resolve", appealController.resolveAppeal);

module.exports = router;