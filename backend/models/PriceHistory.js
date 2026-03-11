import mongoose from "mongoose";

const pricePointSchema = new mongoose.Schema(
  {
    price: {
      type: Number,
      required: true,
    },
    timestamp: {
      type: Date,
      required: true,
      default: Date.now,
    },
    volume: {
      type: Number,
    },
  },
  { _id: false }
);

const priceHistorySchema = new mongoose.Schema(
  {
    symbol: {
      type: String,
      required: true,
      uppercase: true,
      index: true,
    },
    interval: {
      type: String,
      enum: ["1m", "5m", "15m", "1h", "4h", "1d"],
      required: true,
    },
    dataPoints: {
      type: [pricePointSchema],
      default: [],
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index
priceHistorySchema.index({ symbol: 1, interval: 1 }, { unique: true });
priceHistorySchema.index({ lastUpdated: -1 });

// Methods
priceHistorySchema.methods.addDataPoint = async function (price, volume = null) {
  // This method is deprecated in favor of atomic updates
  // Kept for backward compatibility, but uses atomic update internally
  const PriceHistory = this.constructor;

  const newDataPoint = {
    price,
    timestamp: new Date(),
    volume,
  };

  return await PriceHistory.findOneAndUpdate(
    { _id: this._id },
    {
      $push: {
        dataPoints: {
          $each: [newDataPoint],
          $slice: -1000,
        },
      },
      $set: { lastUpdated: new Date() },
    },
    {
      returnDocument: "after",
      runValidators: true,
    }
  );
};

priceHistorySchema.methods.getLatestDataPoints = function (limit = 100) {
  return this.dataPoints.slice(-limit);
};

const PriceHistory = mongoose.model("PriceHistory", priceHistorySchema);

export default PriceHistory;
