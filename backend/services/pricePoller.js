import axios from "axios";
import EventEmitter from "events";
import { MarketPrice, PriceHistory, Portfolio, SystemConfig, Log } from "../models/index.js";

class PricePollingService extends EventEmitter {
  constructor() {
    super();
    this.pollingInterval = null;
    this.isPolling = false;
    this.supportedSymbols = ["BTC", "ETH", "BNB", "SOL", "DOGE"];
    this.cmcApiKey = process.env.CMC_API_KEY;
    this.pollIntervalMs = 10000; // 10 seconds
  }

  // Initialize the price polling service
  async initialize() {
    try {
      // Load configuration
      const pollInterval = await SystemConfig.get("PRICE_POLL_INTERVAL", 10000);
      const symbols = await SystemConfig.get("SUPPORTED_SYMBOLS", this.supportedSymbols);

      this.pollIntervalMs = pollInterval;
      this.supportedSymbols = symbols;

      console.log(`📊 Price polling service initialized`);
      console.log(`   Supported symbols: ${this.supportedSymbols.join(", ")}`);
      console.log(`   Poll interval: ${this.pollIntervalMs}ms`);

      // Do an initial fetch
      await this.fetchPrices();

      // Start polling
      this.startPolling();

      await Log.info("price", "Price polling service initialized", {
        metadata: {
          symbols: this.supportedSymbols,
          interval: this.pollIntervalMs,
        },
      });
    } catch (error) {
      console.error("❌ Failed to initialize price polling service:", error);
      await Log.error("price", "Failed to initialize price polling service", {
        metadata: { error: error.message },
        stack: error.stack,
      });
    }
  }

  // Start polling prices
  startPolling() {
    if (this.isPolling) {
      console.warn("⚠️  Price polling is already running");
      return;
    }

    this.isPolling = true;
    this.pollingInterval = setInterval(async () => {
      await this.fetchPrices();
    }, this.pollIntervalMs);

    console.log("✅ Price polling started");
  }

  // Stop polling prices
  stopPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
      this.isPolling = false;
      console.log("🛑 Price polling stopped");
    }
  }

  // Fetch prices from CoinMarketCap API
  async fetchPrices() {
    try {
      if (!this.cmcApiKey) {
        // If no API key, use mock data for development
        await this.fetchMockPrices();
        return;
      }

      // Fetch from CoinMarketCap API
      const response = await axios.get(
        "https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest",
        {
          headers: {
            "X-CMC_PRO_API_KEY": this.cmcApiKey,
          },
          params: {
            symbol: this.supportedSymbols.join(","),
            convert: "USD",
          },
        }
      );

      const data = response.data.data;
      const priceMap = {};
      const fullPriceData = {};

      // Process each symbol
      for (const symbol of this.supportedSymbols) {
        if (!data[symbol]) continue;

        const coinData = data[symbol];
        const quote = coinData.quote.USD;

        const priceData = {
          symbol: coinData.symbol,
          name: coinData.name,
          price: quote.price,
          percentChange1h: quote.percent_change_1h,
          percentChange24h: quote.percent_change_24h,
          percentChange7d: quote.percent_change_7d,
          marketCap: quote.market_cap,
          volume24h: quote.volume_24h,
          circulatingSupply: coinData.circulating_supply,
          maxSupply: coinData.max_supply,
          cmcRank: coinData.cmc_rank,
          lastUpdated: new Date(quote.last_updated),
        };

        // Update or create market price
        await MarketPrice.findOneAndUpdate({ symbol: coinData.symbol }, priceData, {
          upsert: true,
          returnDocument: "after",
        });

        priceMap[symbol] = quote.price;
        fullPriceData[symbol] = {
          price: quote.price,
          percentChange1h: quote.percent_change_1h,
          percentChange24h: quote.percent_change_24h,
        };

        // Add to price history (1m interval) - don't let errors stop polling
        try {
          await this.addToPriceHistory(symbol, quote.price, quote.volume_24h);
        } catch (err) {
          // Silently continue - already logged in addToPriceHistory
        }
      }

      // Update all user portfolios with new prices
      await this.updateAllPortfolios(priceMap);

      // Emit price update event with full data
      this.emit("pricesUpdated", fullPriceData);

      // Silently update prices (uncomment line below for debugging)
      // console.log(`📈 Prices updated: ${Object.keys(priceMap).length} symbols`);
    } catch (error) {
      console.error("❌ Failed to fetch prices:", error.message);
      // Don't crash the service - just log the error
      try {
        await Log.error("price", "Failed to fetch prices from CoinMarketCap", {
          metadata: { error: error.message },
        });
      } catch (logError) {
        // If even logging fails, just console.error it
        console.error("Failed to log error:", logError.message);
      }
    }
  }

  // Fetch mock prices for development (when no API key)
  async fetchMockPrices() {
    try {
      // Generate realistic mock prices with small variations
      const mockPrices = {
        BTC: 45000 + (Math.random() - 0.5) * 1000,
        ETH: 2500 + (Math.random() - 0.5) * 100,
        BNB: 320 + (Math.random() - 0.5) * 20,
        SOL: 105 + (Math.random() - 0.5) * 5,
        DOGE: 0.085 + (Math.random() - 0.5) * 0.005,
      };

      const priceMap = {};
      const fullPriceData = {};

      for (const symbol of this.supportedSymbols) {
        const price = mockPrices[symbol] || 100;
        const percentChange1h = (Math.random() - 0.5) * 4; // -2% to +2%
        const percentChange24h = (Math.random() - 0.5) * 10; // -5% to +5%

        const priceData = {
          symbol,
          name: this.getCoinName(symbol),
          price,
          percentChange1h,
          percentChange24h,
          percentChange7d: (Math.random() - 0.5) * 20,
          marketCap: price * 1000000000,
          volume24h: price * 10000000,
          circulatingSupply: 1000000000,
          maxSupply: 21000000000,
          cmcRank: this.supportedSymbols.indexOf(symbol) + 1,
          lastUpdated: new Date(),
          source: "mock",
        };

        await MarketPrice.findOneAndUpdate({ symbol }, priceData, {
          upsert: true,
          returnDocument: "after",
        });

        priceMap[symbol] = price;
        fullPriceData[symbol] = {
          price,
          percentChange1h,
          percentChange24h,
        };

        // Add to price history - don't let errors stop polling
        try {
          await this.addToPriceHistory(symbol, price, priceData.volume24h);
        } catch (err) {
          // Silently continue - already logged in addToPriceHistory
        }
      }

      // Update all user portfolios with new prices
      await this.updateAllPortfolios(priceMap);

      // Emit price update event with full data
      this.emit("pricesUpdated", fullPriceData);

      // Silently update prices (uncomment line below for debugging)
      // console.log(`📈 Mock prices updated: ${Object.keys(priceMap).length} symbols`);
    } catch (error) {
      console.error("❌ Failed to fetch mock prices:", error.message);
      // Don't crash - continue polling
    }
  }

  // Add price data to history with retry logic
  async addToPriceHistory(symbol, price, volume, retries = 3) {
    try {
      const newDataPoint = {
        price,
        timestamp: new Date(),
        volume,
      };

      // Use atomic findOneAndUpdate to avoid version conflicts
      const result = await PriceHistory.findOneAndUpdate(
        { symbol, interval: "1m" },
        {
          $push: {
            dataPoints: {
              $each: [newDataPoint],
              $slice: -1000, // Keep only last 1000 data points
            },
          },
          $set: { lastUpdated: new Date() },
        },
        {
          upsert: true,
          returnDocument: "after",
          runValidators: true,
        }
      );

      return result;
    } catch (error) {
      // Retry on version errors or duplicate key errors
      if ((error.name === "VersionError" || error.code === 11000) && retries > 0) {
        const delay = Math.pow(2, 3 - retries) * 100; // Exponential backoff: 100ms, 200ms, 400ms
        await new Promise((resolve) => setTimeout(resolve, delay));
        return this.addToPriceHistory(symbol, price, volume, retries - 1);
      }

      console.error(`❌ Failed to add price history for ${symbol}:`, error.message);
      // Don't throw - just log the error to prevent crashing the polling service
      return null;
    }
  }

  // Update all user portfolios with new prices
  async updateAllPortfolios(priceMap) {
    try {
      const portfolios = await Portfolio.find({});

      for (const portfolio of portfolios) {
        const hasRelevantHoldings = portfolio.holdings.some((h) => priceMap[h.symbol]);

        if (hasRelevantHoldings) {
          await portfolio.updatePrices(priceMap);
        }
      }

      // Silently update portfolios (uncomment line below for debugging)
      // if (portfolios.length > 0) {
      //   console.log(`💼 Updated ${portfolios.length} portfolios`);
      // }
    } catch (error) {
      console.error("❌ Failed to update portfolios:", error);
    }
  }

  // Get current price for a symbol
  async getCurrentPrice(symbol) {
    const marketPrice = await MarketPrice.findOne({
      symbol: symbol.toUpperCase(),
    });
    return marketPrice ? marketPrice.price : null;
  }

  // Get all current prices
  async getAllPrices() {
    return await MarketPrice.getAllPrices();
  }

  // Get price history for a symbol
  async getPriceHistory(symbol, interval = "1m", limit = 100) {
    const history = await PriceHistory.findOne({
      symbol: symbol.toUpperCase(),
      interval,
    });
    return history ? history.getLatestDataPoints(limit) : [];
  }

  // Get coin name from symbol
  getCoinName(symbol) {
    const names = {
      BTC: "Bitcoin",
      ETH: "Ethereum",
      BNB: "BNB",
      SOL: "Solana",
      DOGE: "Dogecoin",
    };
    return names[symbol] || symbol;
  }

  // Shutdown service gracefully
  async shutdown() {
    console.log("🛑 Shutting down price polling service...");
    this.stopPolling();
    console.log("✅ Price polling service shut down");
  }
}

// Singleton instance
const pricePollingService = new PricePollingService();

export default pricePollingService;
