import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createServer } from "http";
import { Server } from "socket.io";
import router from "./routes/routes.js";
import admin from "./config/firebase.js";
import connectDB from "./config/db.js";
import workflowExecutor from "./services/executor.js";
import pricePollingService from "./services/pricePoller.js";
import liquidationMonitor from "./services/liquidationMonitor.js";
import { SystemConfig, NodeType, User, Portfolio } from "./models/index.js";
import { errorHandler, notFoundHandler } from "./middleware/error.middleware.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const httpServer = createServer(app);

// Socket.io setup with better error handling
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true,
  },
  transports: ["websocket", "polling"],
  pingTimeout: 60000,
  pingInterval: 25000,
  allowEIO3: true,
  connectTimeout: 45000,
});

// Handle Socket.io errors
io.engine.on("connection_error", (err) => {
  console.log("🔌 Socket.io connection error:", err.code, err.message);
});

// Verify Firebase initialization
console.log("Firebase Admin initialized:", admin.apps.length ? "✓" : "✗");

// Middleware
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Make io accessible to routes
app.set("io", io);

// Routes
app.get("/", (req, res) => {
  res.json({
    message: "n8n Exchange API",
    status: "running",
    version: "1.0.0",
  });
});

app.use("/api", router);

// Error handling middleware (must be after all routes)
app.use(notFoundHandler);
app.use(errorHandler);

// Socket.io connection handling
io.on("connection", (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);

  socket.on("disconnect", (reason) => {
    console.log(`🔌 Client disconnected: ${socket.id} (${reason})`);
  });

  socket.on("error", (error) => {
    console.error(`🔌 Socket error for ${socket.id}:`, error.message);
  });

  // Join user-specific room for notifications
  socket.on("join", (userId) => {
    socket.join(`user-${userId}`);
    console.log(`👤 User ${userId} joined their room`);
  });
});

// Listen to price updates and broadcast via WebSocket
pricePollingService.on("pricesUpdated", (priceMap) => {
  io.emit("priceUpdate", priceMap);
});

// Listen to workflow execution events
workflowExecutor.on("workflowExecuted", (data) => {
  io.to(`user-${data.workflow.userId}`).emit("workflowExecuted", {
    workflowId: data.workflow._id,
    workflowName: data.workflow.name,
    executionId: data.execution._id,
    status: data.execution.status,
  });
});

// Listen to liquidation events
liquidationMonitor.on("positionLiquidated", (data) => {
  io.to(`user-${data.position.userId}`).emit("positionLiquidated", {
    positionId: data.position._id,
    symbol: data.position.symbol,
    type: data.position.type,
    entryPrice: data.position.entryPrice,
    liquidationPrice: data.position.liquidationPrice,
    currentPrice: data.currentPrice,
    collateralLost: data.collateralLost,
  });
});

// Listen to position opened events
workflowExecutor.on("positionOpened", (data) => {
  io.to(`user-${data.position.userId}`).emit("positionOpened", {
    positionId: data.position._id,
    symbol: data.position.symbol,
    type: data.position.type,
    entryPrice: data.position.entryPrice,
    size: data.position.size,
    leverage: data.position.leverage,
    collateral: data.position.collateral,
    liquidationPrice: data.position.liquidationPrice,
  });
});

// Listen to position closed events
workflowExecutor.on("positionClosed", (data) => {
  io.to(`user-${data.position.userId}`).emit("positionClosed", {
    positionId: data.position._id,
    symbol: data.position.symbol,
    type: data.position.type,
    entryPrice: data.position.entryPrice,
    exitPrice: data.position.exitPrice,
    realizedPnL: data.position.realizedPnL,
    realizedPnLPercent: data.position.realizedPnLPercent,
  });
});

// Initialize services and start server
async function startServer() {
  try {
    console.log("\n🚀 Starting n8n Exchange Backend...\n");

    // 1. Connect to MongoDB
    await connectDB();

    // 2. Initialize system configuration
    console.log("⚙️  Initializing system configuration...");
    await SystemConfig.initializeDefaults();

    // 3. Initialize node types
    console.log("📦 Initializing node types...");
    await NodeType.initializeDefaults();

    // 4. Start price polling service
    console.log("📊 Starting price polling service...");
    await pricePollingService.initialize();

    // 5. Start workflow executor
    console.log("⚡ Starting workflow executor...");
    await workflowExecutor.initialize();

    // 6. Start liquidation monitor
    console.log("⚠️  Starting liquidation monitor...");
    await liquidationMonitor.initialize();

    // 7. Start HTTP server
    httpServer.listen(PORT, () => {
      console.log("\n✅ Server ready!");
      console.log(`   HTTP Server: http://localhost:${PORT}`);
      console.log(`   WebSocket: ws://localhost:${PORT}`);
      console.log(`   Firebase Auth: Enabled`);
      console.log(`   MongoDB: Connected`);
      console.log("\n📡 Services running:");
      console.log("   - Price Polling Service");
      console.log("   - Workflow Executor");
      console.log("   - Liquidation Monitor");
      console.log("   - WebSocket Server");
      console.log("\n✨ Ready to accept requests!\n");
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
}

// Graceful shutdown
async function gracefulShutdown(signal) {
  console.log(`\n⚠️  Received ${signal}, shutting down gracefully...`);

  try {
    // Stop accepting new connections
    httpServer.close(() => {
      console.log("✅ HTTP server closed");
    });

    // Shutdown services
    await workflowExecutor.shutdown();
    await pricePollingService.shutdown();
    await liquidationMonitor.shutdown();

    // Close Socket.io
    io.close(() => {
      console.log("✅ WebSocket server closed");
    });

    console.log("✅ Graceful shutdown completed");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error during shutdown:", error);
    process.exit(1);
  }
}

// Handle shutdown signals
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// Handle uncaught errors - log but don't exit to keep server running
process.on("uncaughtException", (error) => {
  console.error("❌ Uncaught Exception:", error);
  console.error("Stack:", error.stack);
  // Don't exit - log and continue (unless it's a critical error)
  if (error.code === "EADDRINUSE" || error.message.includes("MongoDB")) {
    console.error("💥 Critical error detected, shutting down...");
    gracefulShutdown("uncaughtException");
  }
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("❌ Unhandled Rejection at:", promise, "reason:", reason);
  // Log but don't exit - let the application continue running
  console.error("⚠️  Server will continue running. Please fix the issue.");
});

// Start the server
startServer();
