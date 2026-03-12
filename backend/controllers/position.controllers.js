import { Position, MarketPrice } from "../models/index.js";

/**
 * GET /api/positions
 * Get all positions (open + closed) for the user
 */
export const getAllPositions = async (req, res) => {
  try {
    const userId = req.user.uid;
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;
    const { symbol, type, status } = req.query;

    const filter = { userId };

    if (symbol) {
      filter.symbol = symbol.toUpperCase();
    }

    if (type && ["long", "short"].includes(type)) {
      filter.type = type;
    }

    if (status && ["open", "closed", "liquidated"].includes(status)) {
      filter.status = status;
    }

    const positions = await Position.find(filter)
      .sort({ openedAt: -1 })
      .skip(offset)
      .limit(limit)
      .lean();

    const total = await Position.countDocuments(filter);

    // Add current prices and unrealized PnL for open positions
    const enrichedPositions = await Promise.all(
      positions.map(async (position) => {
        if (position.status === "open") {
          const marketPrice = await MarketPrice.findOne({
            symbol: position.symbol,
          });
          if (marketPrice) {
            const currentPrice = marketPrice.price;
            const sizeInUSD = position.size;
            const entryPrice = position.entryPrice;
            const leverage = position.leverage;

            let unrealizedPnL = 0;
            if (position.type === "long") {
              unrealizedPnL = (sizeInUSD / entryPrice) * (currentPrice - entryPrice);
            } else {
              unrealizedPnL = (sizeInUSD / entryPrice) * (entryPrice - currentPrice);
            }

            const unrealizedPnLPercent = (unrealizedPnL / (sizeInUSD / leverage)) * 100;

            return {
              ...position,
              currentPrice,
              unrealizedPnL,
              unrealizedPnLPercent,
            };
          }
        }
        return position;
      })
    );

    res.status(200).json({
      success: true,
      data: enrichedPositions,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
  } catch (error) {
    console.error("Error fetching positions:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch positions",
      message: error.message,
    });
  }
};

/**
 * GET /api/positions/open
 * Get only open positions for the user
 */
export const getOpenPositions = async (req, res) => {
  try {
    const userId = req.user.uid;

    const positions = await Position.find({ userId, status: "open" }).sort({ openedAt: -1 }).lean();

    // Enrich with current prices and unrealized PnL
    const enrichedPositions = await Promise.all(
      positions.map(async (position) => {
        const marketPrice = await MarketPrice.findOne({
          symbol: position.symbol,
        });
        if (marketPrice) {
          const currentPrice = marketPrice.price;
          const sizeInUSD = position.size;
          const entryPrice = position.entryPrice;
          const leverage = position.leverage;

          let unrealizedPnL = 0;
          if (position.type === "long") {
            unrealizedPnL = (sizeInUSD / entryPrice) * (currentPrice - entryPrice);
          } else {
            unrealizedPnL = (sizeInUSD / entryPrice) * (entryPrice - currentPrice);
          }

          const unrealizedPnLPercent = (unrealizedPnL / (sizeInUSD / leverage)) * 100;

          return {
            ...position,
            currentPrice,
            unrealizedPnL,
            unrealizedPnLPercent,
          };
        }
        return position;
      })
    );

    res.status(200).json({
      success: true,
      data: enrichedPositions,
    });
  } catch (error) {
    console.error("Error fetching open positions:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch open positions",
      message: error.message,
    });
  }
};

/**
 * GET /api/positions/closed
 * Get closed positions with realized PnL
 */
export const getClosedPositions = async (req, res) => {
  try {
    const userId = req.user.uid;
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;

    const positions = await Position.find({
      userId,
      status: { $in: ["closed", "liquidated"] },
    })
      .sort({ closedAt: -1 })
      .skip(offset)
      .limit(limit)
      .lean();

    const total = await Position.countDocuments({
      userId,
      status: { $in: ["closed", "liquidated"] },
    });

    res.status(200).json({
      success: true,
      data: positions,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
  } catch (error) {
    console.error("Error fetching closed positions:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch closed positions",
      message: error.message,
    });
  }
};

/**
 * GET /api/positions/:id
 * Get a single position by ID
 */
export const getPositionById = async (req, res) => {
  try {
    const userId = req.user.uid;
    const positionId = req.params.id;

    const position = await Position.findOne({
      _id: positionId,
      userId,
    }).lean();

    if (!position) {
      return res.status(404).json({
        success: false,
        error: "Position not found",
        message: "The requested position does not exist or you don't have access to it",
      });
    }

    // If open, add current price and unrealized PnL
    if (position.status === "open") {
      const marketPrice = await MarketPrice.findOne({
        symbol: position.symbol,
      });
      if (marketPrice) {
        const currentPrice = marketPrice.price;
        const sizeInUSD = position.size;
        const entryPrice = position.entryPrice;
        const leverage = position.leverage;

        let unrealizedPnL = 0;
        if (position.type === "long") {
          unrealizedPnL = (sizeInUSD / entryPrice) * (currentPrice - entryPrice);
        } else {
          unrealizedPnL = (sizeInUSD / entryPrice) * (entryPrice - currentPrice);
        }

        const unrealizedPnLPercent = (unrealizedPnL / (sizeInUSD / leverage)) * 100;

        position.currentPrice = currentPrice;
        position.unrealizedPnL = unrealizedPnL;
        position.unrealizedPnLPercent = unrealizedPnLPercent;
      }
    }

    res.status(200).json({
      success: true,
      data: position,
    });
  } catch (error) {
    console.error("Error fetching position:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch position",
      message: error.message,
    });
  }
};

/**
 * GET /api/positions/stats
 * Get position statistics and aggregated data
 */
export const getPositionStats = async (req, res) => {
  try {
    const userId = req.user.uid;

    const allPositions = await Position.find({ userId }).lean();

    const stats = {
      totalPositions: allPositions.length,
      openPositions: 0,
      closedPositions: 0,
      liquidatedPositions: 0,
      totalRealizedPnL: 0,
      totalUnrealizedPnL: 0,
      winningTrades: 0,
      losingTrades: 0,
      winRate: 0,
      bySymbol: {},
    };

    // Get current prices for unrealized PnL calculation
    const marketPrices = await MarketPrice.find().lean();
    const priceMap = {};
    marketPrices.forEach((mp) => {
      priceMap[mp.symbol] = mp.price;
    });

    for (const position of allPositions) {
      // Count by status
      if (position.status === "open") {
        stats.openPositions++;

        // Calculate unrealized PnL
        const currentPrice = priceMap[position.symbol];
        if (currentPrice) {
          const sizeInUSD = position.size;
          const entryPrice = position.entryPrice;

          let unrealizedPnL = 0;
          if (position.type === "long") {
            unrealizedPnL = (sizeInUSD / entryPrice) * (currentPrice - entryPrice);
          } else {
            unrealizedPnL = (sizeInUSD / entryPrice) * (entryPrice - currentPrice);
          }

          stats.totalUnrealizedPnL += unrealizedPnL;
        }
      } else if (position.status === "closed") {
        stats.closedPositions++;
        const pnl = position.realizedPnL || 0;
        stats.totalRealizedPnL += pnl;

        if (pnl > 0) {
          stats.winningTrades++;
        } else if (pnl < 0) {
          stats.losingTrades++;
        }
      } else if (position.status === "liquidated") {
        stats.liquidatedPositions++;
        const pnl = position.realizedPnL || 0;
        stats.totalRealizedPnL += pnl;
        stats.losingTrades++;
      }

      // Group by symbol
      if (!stats.bySymbol[position.symbol]) {
        stats.bySymbol[position.symbol] = {
          symbol: position.symbol,
          totalPositions: 0,
          openPositions: 0,
          closedPositions: 0,
          totalRealizedPnL: 0,
          totalUnrealizedPnL: 0,
        };
      }

      const symbolStats = stats.bySymbol[position.symbol];
      symbolStats.totalPositions++;

      if (position.status === "open") {
        symbolStats.openPositions++;
      } else {
        symbolStats.closedPositions++;
        symbolStats.totalRealizedPnL += position.realizedPnL || 0;
      }
    }

    // Calculate win rate
    const totalClosedTrades = stats.closedPositions + stats.liquidatedPositions;
    if (totalClosedTrades > 0) {
      stats.winRate = (stats.winningTrades / totalClosedTrades) * 100;
    }

    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("Error fetching position stats:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch position stats",
      message: error.message,
    });
  }
};
