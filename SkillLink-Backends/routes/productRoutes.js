const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const optionalAuth = require("../middleware/optionalAuth");
const productController = require("../controllers/productController");

// Public browsing (viewer-aware for privacy of sold items on own profile)
router.get("/", optionalAuth, productController.getProducts);
router.get("/user/:userId", optionalAuth, productController.getUserProducts);
router.get("/:id", optionalAuth, productController.getProductById);

// Authenticated actions
router.post("/", protect, productController.createProduct);
router.put("/:id", protect, productController.updateProduct);
router.delete("/:id", protect, productController.deleteProduct);
router.put("/:id/sold", protect, productController.toggleSold);

module.exports = router;