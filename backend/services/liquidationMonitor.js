import EventEmitter from "events";
import { Position, User, MarketPrice, Log } from "../models/index.js";

class LiquidationMonitor extends EventEmitter {
  constructor() {
    super();
    this.monitorInterval = null;
    this.isMonitoring = false;
    this.checkIntervalMs = 5000; // Check every 5 seconds
  }

  // Initialize liquidation monitoring
  async initialize() {
    try {
      console.log("⚠️  Liquidation monitor initialized");
      this.startMonitoring();

      await Log.info("liquidation", "Liquidation monitor service started", {
        checkInterval: this.checkIntervalMs,
      });
    } catch (error) {
      console.error("❌ Failed to initialize liquidation monitor:", error);
      await Log.error("liquidation", "Failed to initialize liquidation monitor", {
        metadata: { error: error.message },
        stack: error.stack,
      });
    }
  }

  // Start monitoring open positions
  startMonitoring() {
    if (this.isMonitoring) {
      console.warn("⚠️  Liquidation monitor is already running");
      return;
    }

    this.isMonitoring = true;
    this.monitorInterval = setInterval(async () => {
      await this.checkPositions();
    }, this.checkIntervalMs);

    console.log("✅ Liquidation monitoring started");
  }

  // Stop monitoring
  stopMonitoring() {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
      this.isMonitoring = false;
      console.log("🛑 Liquidation monitoring stopped");
    }
  }

  // Check all open positions for liquidation
  async checkPositions() {
    try {
      // Get all open positions
      const openPositions = await Position.find({ status: "open" });

      if (openPositions.length === 0) return;

      // Group positions by symbol for efficient price fetching
      const symbolMap = new Map();
      for (const position of openPositions) {
        if (!symbolMap.has(position.symbol)) {
          symbolMap.set(position.symbol, []);
        }
        symbolMap.get(position.symbol).push(position);
      }

      // Check each symbol's positions
      for (const [symbol, positions] of symbolMap.entries()) {
        const marketPrice = await MarketPrice.findOne({ symbol });
        if (!marketPrice) continue;

        const currentPrice = marketPrice.price;

        // Check each position for liquidation
        for (const position of positions) {
          if (position.shouldLiquidate(currentPrice)) {
            await this.liquidatePosition(position, currentPrice);
          } else {
            // Update position with current price and PnL
            try {
              await position.updatePrice(currentPrice);
            } catch (error) {
              // Silently continue if update fails
              console.error(`Failed to update position ${position._id}:`, error.message);
            }
          }
        }
      }
    } catch (error) {
      console.error("❌ Liquidation check failed:", error.message);
      // Don't crash the service - just log and continue
    }
  }

  // Liquidate a position
  async liquidatePosition(position, currentPrice) {
    try {
      console.log(
        `💥 LIQUIDATING ${position.type.toUpperCase()}: ${position.symbol} | Entry: $${position.entryPrice.toFixed(2)} | Current: $${currentPrice.toFixed(2)} | Liq: $${position.liquidationPrice.toFixed(2)}`
      );

      // Calculate final PnL (will be negative at liquidation)
      position.calculateUnrealizedPnL(currentPrice);

      // Get user
      const user = await User.findOne({ uid: position.userId });
      if (!user) {
        console.error(`User not found for position ${position._id}`);
        return;
      }

      // Close position as liquidated
      await position.close(currentPrice, "liquidated");

      // The collateral is lost in liquidation, so don't return balance
      // (In a real system, maintenance margin would be returned)
      const maintenanceMargin = position.collateral * 0.05; // 5% maintenance margin
      if (maintenanceMargin > 0) {
        await user.updateBalance(maintenanceMargin);
      }

      // Log liquidation event
      await Log.error("liquidation", `Position liquidated: ${position.symbol}`, {
        userId: position.userId,
        positionId: position._id,
        symbol: position.symbol,
        type: position.type,
        entryPrice: position.entryPrice,
        liquidationPrice: position.liquidationPrice,
        currentPrice,
        collateralLost: position.collateral - maintenanceMargin,
        metadata: {
          leverage: position.leverage,
          quantity: position.quantity,
        },
      });

      // Emit liquidation event
      this.emit("positionLiquidated", {
        position,
        currentPrice,
        collateralLost: position.collateral - maintenanceMargin,
      });

      console.log(
        `⚠️  Position ${position._id} liquidated. Collateral lost: $${(position.collateral - maintenanceMargin).toFixed(2)}`
      );
    } catch (error) {
      console.error(`❌ Failed to liquidate position ${position._id}:`, error);
      await Log.error("liquidation", "Failed to liquidate position", {
        positionId: position._id,
        metadata: { error: error.message },
        stack: error.stack,
      });
    }
  }

  // Get positions at risk (within 20% of liquidation)
  async getPositionsAtRisk() {
    try {
      const openPositions = await Position.find({ status: "open" });
      const atRisk = [];

      for (const position of openPositions) {
        const marketPrice = await MarketPrice.findOne({ symbol: position.symbol });
        if (!marketPrice) continue;

        const currentPrice = marketPrice.price;
        const riskPercent =
          Math.abs((currentPrice - position.liquidationPrice) / position.liquidationPrice) * 100;

        if (riskPercent < 20) {
          atRisk.push({
            position,
            currentPrice,
            liquidationPrice: position.liquidationPrice,
            riskPercent: riskPercent.toFixed(2),
          });
        }
      }

      return atRisk;
    } catch (error) {
      console.error("❌ Failed to get positions at risk:", error);
      return [];
    }
  }

  // Shutdown gracefully
  async shutdown() {
    console.log("🛑 Shutting down liquidation monitor...");
    this.stopMonitoring();
    console.log("✅ Liquidation monitor shut down");
  }
}

// Singleton instance
const liquidationMonitor = new LiquidationMonitor();

export default liquidationMonitor;
