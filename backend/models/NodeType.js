import mongoose from "mongoose";

const nodeTypeSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    category: {
      type: String,
      enum: ["trigger", "action", "logic"],
      required: true,
    },
    label: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    icon: {
      type: String,
    },
    color: {
      type: String,
    },
    configSchema: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    defaultConfig: {
      type: mongoose.Schema.Types.Mixed,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    version: {
      type: String,
      default: "1.0.0",
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
nodeTypeSchema.index({ category: 1 });
nodeTypeSchema.index({ isActive: 1 });

// Statics
nodeTypeSchema.statics.initializeDefaults = async function () {
  const nodeTypes = [
    {
      type: "timer",
      category: "trigger",
      label: "Timer",
      description: "Trigger workflow on a schedule using cron expressions",
      icon: "⏰",
      color: "#3b82f6",
      configSchema: {
        cronExpression: {
          type: "string",
          required: true,
          label: "Cron Expression",
        },
        timezone: { type: "string", default: "UTC", label: "Timezone" },
      },
      defaultConfig: {
        cronExpression: "*/5 * * * *",
        timezone: "UTC",
      },
    },
    {
      type: "price-monitor",
      category: "trigger",
      label: "Price Monitor",
      description: "Trigger when cryptocurrency price meets condition",
      icon: "📊",
      color: "#8b5cf6",
      configSchema: {
        symbol: { type: "string", required: true, label: "Symbol" },
        condition: {
          type: "string",
          enum: ["above", "below", "equals"],
          required: true,
          label: "Condition",
        },
        targetPrice: { type: "number", required: true, label: "Target Price" },
        pollInterval: {
          type: "number",
          default: 10000,
          label: "Poll Interval (ms)",
        },
      },
      defaultConfig: {
        symbol: "BTC",
        condition: "above",
        targetPrice: 50000,
        pollInterval: 10000,
      },
    },
    {
      type: "condition",
      category: "logic",
      label: "Condition",
      description: "Evaluate conditions and route workflow accordingly",
      icon: "🔀",
      color: "#f59e0b",
      configSchema: {
        operator: {
          type: "string",
          enum: [">", "<", ">=", "<=", "==", "!="],
          required: true,
          label: "Operator",
        },
        leftValue: { type: "string", required: true, label: "Left Value" },
        rightValue: { type: "string", required: true, label: "Right Value" },
      },
      defaultConfig: {
        operator: ">",
        leftValue: "",
        rightValue: "",
      },
    },
    {
      type: "buy",
      category: "action",
      label: "Buy",
      description: "Execute a buy order for cryptocurrency",
      icon: "💰",
      color: "#10b981",
      configSchema: {
        symbol: { type: "string", required: true, label: "Symbol" },
        amountType: {
          type: "string",
          enum: ["usd", "quantity", "percentage"],
          required: true,
          label: "Amount Type",
        },
        amount: { type: "number", required: true, label: "Amount" },
        useCurrentPrice: {
          type: "boolean",
          default: true,
          label: "Use Current Price",
        },
        limitPrice: { type: "number", label: "Limit Price" },
      },
      defaultConfig: {
        symbol: "BTC",
        amountType: "usd",
        amount: 100,
        useCurrentPrice: true,
      },
    },
    {
      type: "sell",
      category: "action",
      label: "Sell",
      description: "Execute a sell order for cryptocurrency",
      icon: "💸",
      color: "#ef4444",
      configSchema: {
        symbol: { type: "string", required: true, label: "Symbol" },
        amountType: {
          type: "string",
          enum: ["quantity", "percentage", "all"],
          required: true,
          label: "Amount Type",
        },
        amount: { type: "number", label: "Amount" },
        useCurrentPrice: {
          type: "boolean",
          default: true,
          label: "Use Current Price",
        },
        limitPrice: { type: "number", label: "Limit Price" },
      },
      defaultConfig: {
        symbol: "BTC",
        amountType: "percentage",
        amount: 50,
        useCurrentPrice: true,
      },
    },
    {
      type: "price-cross-above",
      category: "trigger",
      label: "Price Cross Above",
      description: "Trigger when price crosses above a threshold",
      icon: "📈",
      color: "#10b981",
      configSchema: {
        symbol: { type: "string", required: true, label: "Symbol" },
        targetPrice: { type: "number", required: true, label: "Target Price" },
        pollInterval: {
          type: "number",
          default: 10000,
          label: "Poll Interval (ms)",
        },
      },
      defaultConfig: {
        symbol: "BTC",
        targetPrice: 50000,
        pollInterval: 10000,
      },
    },
    {
      type: "price-cross-below",
      category: "trigger",
      label: "Price Cross Below",
      description: "Trigger when price crosses below a threshold",
      icon: "📉",
      color: "#ef4444",
      configSchema: {
        symbol: { type: "string", required: true, label: "Symbol" },
        targetPrice: { type: "number", required: true, label: "Target Price" },
        pollInterval: {
          type: "number",
          default: 10000,
          label: "Poll Interval (ms)",
        },
      },
      defaultConfig: {
        symbol: "BTC",
        targetPrice: 45000,
        pollInterval: 10000,
      },
    },
    {
      type: "stop-loss",
      category: "trigger",
      label: "Stop Loss",
      description: "Automatically sell when price drops to limit losses",
      icon: "🛡️",
      color: "#dc2626",
      configSchema: {
        symbol: { type: "string", required: true, label: "Symbol" },
        stopPrice: { type: "number", required: true, label: "Stop Price" },
        pollInterval: {
          type: "number",
          default: 5000,
          label: "Poll Interval (ms)",
        },
      },
      defaultConfig: {
        symbol: "BTC",
        stopPrice: 45000,
        pollInterval: 5000,
      },
    },
    {
      type: "take-profit",
      category: "trigger",
      label: "Take Profit",
      description: "Automatically sell when price reaches profit target",
      icon: "🎯",
      color: "#16a34a",
      configSchema: {
        symbol: { type: "string", required: true, label: "Symbol" },
        targetPrice: { type: "number", required: true, label: "Target Price" },
        pollInterval: {
          type: "number",
          default: 5000,
          label: "Poll Interval (ms)",
        },
      },
      defaultConfig: {
        symbol: "BTC",
        targetPrice: 55000,
        pollInterval: 5000,
      },
    },
    {
      type: "trailing-stop",
      category: "trigger",
      label: "Trailing Stop",
      description: "Dynamic stop loss that follows price increases",
      icon: "📊",
      color: "#f59e0b",
      configSchema: {
        symbol: { type: "string", required: true, label: "Symbol" },
        trailingPercent: {
          type: "number",
          required: true,
          label: "Trailing Percentage",
          min: 1,
          max: 50,
        },
        pollInterval: {
          type: "number",
          default: 5000,
          label: "Poll Interval (ms)",
        },
      },
      defaultConfig: {
        symbol: "BTC",
        trailingPercent: 10,
        pollInterval: 5000,
      },
    },
    {
      type: "long",
      category: "action",
      label: "Long (Leveraged Buy)",
      description: "Open a leveraged long position",
      icon: "📈",
      color: "#22c55e",
      configSchema: {
        symbol: { type: "string", required: true, label: "Symbol" },
        quantity: { type: "number", required: true, label: "Quantity" },
        leverage: {
          type: "number",
          required: true,
          label: "Leverage",
          min: 1,
          max: 20,
        },
        exchange: {
          type: "string",
          enum: ["lighter", "hyperliquid", "backpack"],
          default: "lighter",
          label: "Exchange",
        },
      },
      defaultConfig: {
        symbol: "SOL",
        quantity: 1,
        leverage: 5,
        exchange: "lighter",
      },
    },
    {
      type: "short",
      category: "action",
      label: "Short (Leveraged Sell)",
      description: "Open a leveraged short position",
      icon: "📉",
      color: "#ef4444",
      configSchema: {
        symbol: { type: "string", required: true, label: "Symbol" },
        quantity: { type: "number", required: true, label: "Quantity" },
        leverage: {
          type: "number",
          required: true,
          label: "Leverage",
          min: 1,
          max: 20,
        },
        exchange: {
          type: "string",
          enum: ["lighter", "hyperliquid", "backpack"],
          default: "lighter",
          label: "Exchange",
        },
      },
      defaultConfig: {
        symbol: "SOL",
        quantity: 1,
        leverage: 5,
        exchange: "lighter",
      },
    },
    {
      type: "close-position",
      category: "action",
      label: "Close Position",
      description: "Close an open leveraged position",
      icon: "🔒",
      color: "#64748b",
      configSchema: {
        symbol: { type: "string", required: true, label: "Symbol" },
        positionType: {
          type: "string",
          enum: ["long", "short", "all"],
          default: "all",
          label: "Position Type",
        },
      },
      defaultConfig: {
        symbol: "SOL",
        positionType: "all",
      },
    },
    {
      type: "notify",
      category: "action",
      label: "Notify",
      description: "Send a notification message",
      icon: "🔔",
      color: "#6366f1",
      configSchema: {
        message: { type: "string", required: true, label: "Message" },
        type: {
          type: "string",
          enum: ["info", "success", "warning", "error"],
          default: "info",
          label: "Type",
        },
      },
      defaultConfig: {
        message: "Workflow executed",
        type: "info",
      },
    },
  ];

  for (const nodeType of nodeTypes) {
    await this.findOneAndUpdate({ type: nodeType.type }, nodeType, {
      upsert: true,
      returnDocument: "after",
    });
  }

  console.log("✅ Node types initialized with defaults");
};

const NodeType = mongoose.model("NodeType", nodeTypeSchema);

export default NodeType;
