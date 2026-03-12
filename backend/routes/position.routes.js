import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware.js";
import {
  getAllPositions,
  getOpenPositions,
  getClosedPositions,
  getPositionById,
  getPositionStats,
} from "../controllers/position.controllers.js";

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Position routes
router.get("/", getAllPositions);
router.get("/open", getOpenPositions);
router.get("/closed", getClosedPositions);
router.get("/stats", getPositionStats);
router.get("/:id", getPositionById);

export default router;
