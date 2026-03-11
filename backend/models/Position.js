import mongoose from "mongoose";

const positionSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    workflowId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workflow",
      index: true,
    },
    executionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Execution",
    },
    symbol: {
      type: String,
      required: true,
      uppercase: true,
      index: true,
    },
    coinName: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ["long", "short"],
      required: true,
    },
    leverage: {
      type: Number,
      required: true,
      min: 1,
      max: 20,
    },
    quantity: {
      type: Number,
      required: true,
    },
    entryPrice: {
      type: Number,
      required: true,
    },
    currentPrice: {
      type: Number,
      required: true,
    },
    collateral: {
      type: Number,
      required: true,
    },
    positionValue: {
      type: Number,
      required: true,
    },
    liquidationPrice: {
      type: Number,
      required: true,
    },
    unrealizedPnL: {
      type: Number,
      default: 0,
    },
    realizedPnL: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ["open", "closed", "liquidated"],
      default: "open",
      required: true,
    },
    exchange: {
      type: String,
      enum: ["lighter", "hyperliquid", "backpack"],
      default: "lighter",
    },
    openedAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
    closedAt: {
      type: Date,
    },
    metadata: {
      orderType: String,
      triggerType: String,
      nodeId: String,
      closingReason: String,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
positionSchema.index({ userId: 1, status: 1 });
positionSchema.index({ symbol: 1, status: 1 });
positionSchema.index({ status: 1, liquidationPrice: 1 }); // For liquidation monitoring
positionSchema.index({ createdAt: -1 });

// Virtual for position size
positionSchema.virtual("positionSize").get(function () {
  return this.quantity * this.currentPrice;
});

// Virtual for margin ratio
positionSchema.virtual("marginRatio").get(function () {
  if (this.collateral === 0) return 0;
  return (this.collateral + this.unrealizedPnL) / this.collateral;
});

// Methods

// Calculate unrealized PnL
positionSchema.methods.calculateUnrealizedPnL = function (currentPrice) {
  this.currentPrice = currentPrice;

  if (this.type === "long") {
    // Long: profit if price goes up
    this.unrealizedPnL = (currentPrice - this.entryPrice) * this.quantity;
  } else {
    // Short: profit if price goes down
    this.unrealizedPnL = (this.entryPrice - currentPrice) * this.quantity;
  }

  return this.unrealizedPnL;
};

// Calculate liquidation price
positionSchema.methods.calculateLiquidationPrice = function () {
  const maintenanceMarginRate = 0.05; // 5% maintenance margin

  if (this.type === "long") {
    // Long liquidation: entry - (collateral * (1 - maintenanceMarginRate)) / quantity
    this.liquidationPrice =
      this.entryPrice - (this.collateral * (1 - maintenanceMarginRate)) / this.quantity;
  } else {
    // Short liquidation: entry + (collateral * (1 - maintenanceMarginRate)) / quantity
    this.liquidationPrice =
      this.entryPrice + (this.collateral * (1 - maintenanceMarginRate)) / this.quantity;
  }

  return this.liquidationPrice;
};

// Check if position should be liquidated
positionSchema.methods.shouldLiquidate = function (currentPrice) {
  if (this.status !== "open") return false;

  if (this.type === "long") {
    return currentPrice <= this.liquidationPrice;
  } else {
    return currentPrice >= this.liquidationPrice;
  }
};

// Close position
positionSchema.methods.close = async function (currentPrice, reason = "manual") {
  this.calculateUnrealizedPnL(currentPrice);
  this.realizedPnL = this.unrealizedPnL;
  this.status = reason === "liquidated" ? "liquidated" : "closed";
  this.closedAt = new Date();
  this.metadata.closingReason = reason;

  return await this.save();
};

// Update position with current price
positionSchema.methods.updatePrice = async function (currentPrice) {
  this.calculateUnrealizedPnL(currentPrice);
  return await this.save();
};

// Statics

// Get all open positions for a user
positionSchema.statics.getOpenPositions = function (userId) {
  return this.find({ userId, status: "open" }).sort({ createdAt: -1 });
};

// Get positions at risk of liquidation
positionSchema.statics.getPositionsAtRisk = function (threshold = 0.1) {
  // Find positions where current loss is within 10% of liquidation
  return this.find({
    status: "open",
  }).lean();
};

// Get total exposure for a user
positionSchema.statics.getTotalExposure = async function (userId) {
  const positions = await this.find({ userId, status: "open" });

  return positions.reduce((total, pos) => {
    return total + pos.positionValue;
  }, 0);
};

// JSON serialization
positionSchema.methods.toJSON = function () {
  const position = this.toObject({ virtuals: true });
  delete position.__v;
  return position;
};

const Position = mongoose.model("Position", positionSchema);

export default Position;
