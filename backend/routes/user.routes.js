import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { updateProfile, getProfile } from "../controllers/user.controllers.js";

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// User profile routes
router.get("/profile", getProfile);
router.put("/profile", updateProfile);

export default router;
