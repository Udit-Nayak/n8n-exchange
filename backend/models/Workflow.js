import mongoose from "mongoose";

const nodeSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      required: true,
      enum: [
        "timer",
        "price-monitor",
        "price-cross-above",
        "price-cross-below",
        "stop-loss",
        "take-profit",
        "trailing-stop",
        "condition",
        "buy",
        "sell",
        "long",
        "short",
        "close-position",
        "notify",
      ],
    },
    position: {
      x: { type: Number, required: true },
      y: { type: Number, required: true },
    },
    data: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
  },
  { _id: false }
);

const edgeSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
    },
    source: {
      type: String,
      required: true,
    },
    target: {
      type: String,
      required: true,
    },
  },
  { _id: false }
);

const cronJobStateSchema = new mongoose.Schema(
  {
    jobId: String,
    cronExpression: String,
    isScheduled: {
      type: Boolean,
      default: false,
    },
    lastRun: Date,
    nextRun: Date,
  },
  { _id: false }
);

const workflowSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    nodes: {
      type: [nodeSchema],
      required: true,
      default: [],
    },
    edges: {
      type: [edgeSchema],
      default: [],
    },
    isActive: {
      type: Boolean,
      default: false,
      index: true,
    },
    cronState: {
      type: cronJobStateSchema,
      default: null,
    },
    statistics: {
      totalExecutions: {
        type: Number,
        default: 0,
      },
      successfulExecutions: {
        type: Number,
        default: 0,
      },
      failedExecutions: {
        type: Number,
        default: 0,
      },
      lastExecutedAt: Date,
    },
    version: {
      type: Number,
      default: 1,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
workflowSchema.index({ userId: 1, isActive: 1 });
workflowSchema.index({ createdAt: -1 });
workflowSchema.index({ "statistics.lastExecutedAt": -1 });

// Methods
workflowSchema.methods.activate = function () {
  this.isActive = true;
  return this.save();
};

workflowSchema.methods.deactivate = function () {
  this.isActive = false;
  return this.save();
};

workflowSchema.methods.updateCronState = function (cronData) {
  this.cronState = {
    ...this.cronState,
    ...cronData,
  };
  return this.save();
};

workflowSchema.methods.incrementExecutionCount = function (success = true) {
  this.statistics.totalExecutions += 1;
  if (success) {
    this.statistics.successfulExecutions += 1;
  } else {
    this.statistics.failedExecutions += 1;
  }
  this.statistics.lastExecutedAt = new Date();
  return this.save();
};

workflowSchema.methods.getTriggerNodes = function () {
  return this.nodes.filter((node) => node.type === "timer" || node.type === "price-monitor");
};

workflowSchema.methods.toJSON = function () {
  const workflow = this.toObject();
  delete workflow.__v;
  return workflow;
};

const Workflow = mongoose.model("Workflow", workflowSchema);

export default Workflow;
