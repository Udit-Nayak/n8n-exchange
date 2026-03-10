/**
 * PORTFOLIO CONTROLLERS - TO BE IMPLEMENTED
 * ==========================================
 *
 * Required imports:
 * - Transaction, Portfolio, User models from '../models/index.js'
 *
 * All functions receive (req, res):
 * - req.user contains { uid, email } from authMiddleware
 */

/**
 * 1. GET /api/portfolio/transactions
 * getTransactions(req, res)
 *
 * Purpose: Get transaction history for the user
 * Access: req.user.uid
 * Query params:
 *   - limit (default: 50)
 *   - offset (default: 0)
 *   - symbol (optional): filter by cryptocurrency symbol
 *   - type (optional): 'buy' or 'sell'
 *   - startDate, endDate (optional): date range filter
 * Response: Array of transactions sorted by timestamp desc
 */

import { Transaction, Portfolio, User } from "../models/index.js";

export const getTransactions = async (req, res) => {
  try {
    const userId = req.user.uid;

    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;
    const { symbol, type, startDate, endDate } = req.query;

    const filter = { userId };

    if (symbol) {
      filter.symbol = symbol.toUpperCase();
    }

    if (type && (type === "buy" || type === "sell")) {
      filter.type = type;
    }

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        filter.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        filter.createdAt.$lte = new Date(endDate);
      }
    }

    const transactions = await Transaction.find(filter)
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .lean();

    const total = await Transaction.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: transactions,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
  } catch (error) {
    console.error("Error fetching transactions:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch transactions",
      message: error.message,
    });
  }
};

/**
 * 2. GET /api/portfolio/transactions/stats
 * getTransactionStats(req, res)
 * Purpose: Get aggregated transaction statistics
 * Access: req.user.uid
 * Query params:
 *   - period (optional): 'day', 'week', 'month', 'all' (default: 'all')
 * Response: {
 *   totalTransactions,
 *   totalBuys,
 *   totalSells,
 *   totalVolume,
 *   totalProfitLoss,
 *   bySymbol: { BTC: {...}, ETH: {...} }
 * }
 */
export const getTransactionStats = async (req, res) => {
  try {
    const userId = req.user.uid;
    const period = req.query.period || "all";

    const validPeriods = ["day", "week", "month", "all"];
    if (!validPeriods.includes(period)) {
      return res.status(400).json({
        success: false,
        error: "Invalid period parameter",
        message: "Period must be one of: day, week, month, all",
      });
    }

    const filter = { userId };

    if (period !== "all") {
      const now = new Date();
      const startDate = new Date();

      switch (period) {
        case "day":
          startDate.setDate(now.getDate() - 1);
          break;
        case "week":
          startDate.setDate(now.getDate() - 7);
          break;
        case "month":
          startDate.setMonth(now.getMonth() - 1);
          break;
      }

      filter.createdAt = { $gte: startDate };
    }

    const transactions = await Transaction.find(filter).lean();

    // Calculate aggregate statistics
    const stats = {
      totalTransactions: transactions.length,
      totalBuys: 0,
      totalSells: 0,
      totalVolume: 0,
      bySymbol: {},
    };

    // Process each transaction
    transactions.forEach((txn) => {
      // Count by type
      if (txn.type === "buy") {
        stats.totalBuys++;
      } else if (txn.type === "sell") {
        stats.totalSells++;
      }

      // Add to total volume
      stats.totalVolume += txn.totalAmount;

      // Group by symbol
      if (!stats.bySymbol[txn.symbol]) {
        stats.bySymbol[txn.symbol] = {
          symbol: txn.symbol,
          coinName: txn.coinName,
          buys: 0,
          sells: 0,
          totalBuyQuantity: 0,
          totalSellQuantity: 0,
          totalBuyVolume: 0,
          totalSellVolume: 0,
          netVolume: 0,
        };
      }

      const symbolStats = stats.bySymbol[txn.symbol];

      if (txn.type === "buy") {
        symbolStats.buys++;
        symbolStats.totalBuyQuantity += txn.quantity;
        symbolStats.totalBuyVolume += txn.totalAmount;
      } else {
        symbolStats.sells++;
        symbolStats.totalSellQuantity += txn.quantity;
        symbolStats.totalSellVolume += txn.totalAmount;
      }

      symbolStats.netVolume = symbolStats.totalBuyVolume - symbolStats.totalSellVolume;
    });

    res.status(200).json({
      success: true,
      period,
      data: stats,
    });
  } catch (error) {
    console.error("Error fetching transaction stats:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch transaction stats",
      message: error.message,
    });
  }
};

/**
 * 3. GET /api/portfolio/portfolio
 * getPortfolio(req, res)
 *
 * Purpose: Get complete portfolio with wallet balance and holdings
 * Access: req.user.uid
 * Response: {
 *   user: { uid, email, wallet: { balance, currency } },
 *   portfolio: { holdings: [], totalValue, totalCost, totalProfitLoss }
 * }
 */
export const getPortfolio = async (req, res) => {
  try {
    const userId = req.user.uid;

    const user = await User.findOne({ uid: userId }).select("uid email displayName wallet").lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found",
        message: "User data not found in database",
      });
    }

    let portfolio = await Portfolio.findOne({ userId }).lean();

    if (!portfolio) {
      portfolio = new Portfolio({
        userId,
        holdings: [],
        totalValue: 0,
        totalInvested: 0,
        totalProfitLoss: 0,
        totalProfitLossPercentage: 0,
      });
      await portfolio.save();
      portfolio = portfolio.toObject();
    }

    res.status(200).json({
      success: true,
      data: {
        user: {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          wallet: user.wallet,
        },
        portfolio: {
          holdings: portfolio.holdings,
          totalValue: portfolio.totalValue,
          totalInvested: portfolio.totalInvested,
          totalProfitLoss: portfolio.totalProfitLoss,
          totalProfitLossPercentage: portfolio.totalProfitLossPercentage,
          lastUpdated: portfolio.lastUpdated,
        },
        totalAssets: user.wallet.balance + portfolio.totalValue,
      },
    });
  } catch (error) {
    console.error("Error fetching portfolio:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch portfolio",
      message: error.message,
    });
  }
};

/**
 * 4. GET /api/portfolio/holdings
 * getHoldings(req, res)
 *
 * Purpose: Get just the holdings array (faster than full portfolio)
 * Access: req.user.uid
 * Response: Array of holdings [{ symbol, quantity, averageBuyPrice, currentPrice, profitLoss, profitLossPercent }]
 */
export const getHoldings = async (req, res) => {
  try {
    const userId = req.user.uid;

    const portfolio = await Portfolio.findOne({ userId })
      .select("holdings totalValue totalInvested totalProfitLoss")
      .lean();

    if (!portfolio) {
      return res.status(200).json({
        success: true,
        data: {
          holdings: [],
          totalValue: 0,
          totalInvested: 0,
          totalProfitLoss: 0,
        },
      });
    }

    res.status(200).json({
      success: true,
      data: {
        holdings: portfolio.holdings,
        totalValue: portfolio.totalValue,
        totalInvested: portfolio.totalInvested,
        totalProfitLoss: portfolio.totalProfitLoss,
      },
    });
  } catch (error) {
    console.error("Error fetching holdings:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch holdings",
      message: error.message,
    });
  }
};
