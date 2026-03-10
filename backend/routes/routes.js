import express from "express";
import auth_route from "./auth.routes.js";
import workflow_route from "./workflow.routes.js";
import portfolio_route from "./portfolio.routes.js";
import price_route from "./price.routes.js";
import user_route from "./user.routes.js";

const router = express.Router();

// Auth routes
router.use("/auth", auth_route);

// User routes
router.use("/user", user_route);

// Workflow routes
router.use("/workflows", workflow_route);

// Portfolio & transaction routes
router.use("/portfolio", portfolio_route);

// Price routes (public)
router.use("/prices", price_route);

export default router;
