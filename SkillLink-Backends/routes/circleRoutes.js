const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const optionalAuth = require("../middleware/optionalAuth");
const circleController = require("../controllers/circleController");
const recommendationController = require("../controllers/recommendationController");

// ===== Circles — public browsing, viewer-aware =====
router.get("/", optionalAuth, circleController.listCircles);
router.get("/mine", protect, circleController.getMyCircle);
router.get("/:id", optionalAuth, circleController.getCircle);

// ===== Membership =====
router.post("/:id/join", protect, circleController.joinCircle);
router.post("/:id/leave", protect, circleController.leaveCircle);

// ===== Requests =====
router.get(
  "/:circleId/requests",
  optionalAuth,
  recommendationController.listRequests
);
router.post(
  "/:circleId/requests",
  protect,
  recommendationController.createRequest
);
router.get(
  "/:circleId/requests/:requestId",
  optionalAuth,
  recommendationController.getRequest
);
router.patch(
  "/:circleId/requests/:requestId/resolve",
  protect,
  recommendationController.resolveRequest
);
router.delete(
  "/:circleId/requests/:requestId",
  protect,
  recommendationController.deleteRequest
);

// ===== Replies =====
router.post(
  "/:circleId/requests/:requestId/replies",
  protect,
  recommendationController.createReply
);
router.delete(
  "/:circleId/requests/:requestId/replies/:replyId",
  protect,
  recommendationController.deleteReply
);

module.exports = router;