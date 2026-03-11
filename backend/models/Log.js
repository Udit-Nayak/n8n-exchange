import mongoose from "mongoose";

const logSchema = new mongoose.Schema(
  {
    level: {
      type: String,
      enum: ["info", "warn", "error", "debug"],
      required: true,
      index: true,
    },
    category: {
      type: String,
      enum: [
        "system",
        "workflow",
        "execution",
        "transaction",
        "price",
        "auth",
        "api",
        "liquidation",
      ],
      required: true,
      index: true,
    },
    message: {
      type: String,
      required: true,
    },
    userId: {
      type: String,
      index: true,
    },
    workflowId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workflow",
    },
    executionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Execution",
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
    },
    stack: {
      type: String,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
      expires: 2592000, // TTL: 30 days in seconds
    },
  },
  {
    timestamps: false,
  }
);

// Indexes
logSchema.index({ level: 1, timestamp: -1 });
logSchema.index({ category: 1, timestamp: -1 });
logSchema.index({ userId: 1, timestamp: -1 });
logSchema.index({ timestamp: -1 });

// Statics
logSchema.statics.log = async function (level, category, message, data = {}) {
  return this.create({
    level,
    category,
    message,
    ...data,
  });
};

logSchema.statics.info = function (category, message, data) {
  return this.log("info", category, message, data);
};

logSchema.statics.warn = function (category, message, data) {
  return this.log("warn", category, message, data);
};

logSchema.statics.error = function (category, message, data) {
  return this.log("error", category, message, data);
};

logSchema.statics.debug = function (category, message, data) {
  return this.log("debug", category, message, data);
};

logSchema.statics.getRecentLogs = async function (filters = {}, limit = 100) {
  return this.find(filters).sort({ timestamp: -1 }).limit(limit);
};

const Log = mongoose.model("Log", logSchema);

export default Log;
