import { useState, useEffect } from "react";
import io from "socket.io-client";

// In development, use empty string to connect to same origin (Vite will proxy)
// In production, this should point to your backend server
const SOCKET_URL = import.meta.env.PROD
  ? import.meta.env.VITE_API_URL || window.location.origin
  : ""; // Empty string uses current origin, Vite proxy handles it

export default function PriceWidget() {
  const [priceData, setPriceData] = useState({});
  const [lastUpdate, setLastUpdate] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Connect to Socket.IO server with automatic reconnection
    const socket = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
      path: "/socket.io",
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: Infinity,
      timeout: 20000,
    });

    socket.on("connect", () => {
      console.log("📊 Connected to price feed");
      setIsConnected(true);
    });

    socket.on("disconnect", (reason) => {
      console.log("📊 Disconnected from price feed:", reason);
      setIsConnected(false);
    });

    socket.on("connect_error", (error) => {
      console.log("📊 Connection error (will retry):", error.message);
      setIsConnected(false);
    });

    socket.on("reconnect_attempt", (attemptNumber) => {
      console.log(`📊 Reconnection attempt ${attemptNumber}...`);
    });

    socket.on("reconnect", (attemptNumber) => {
      console.log(`📊 Reconnected after ${attemptNumber} attempts`);
      setIsConnected(true);
    });

    // Listen for price updates
    socket.on("priceUpdate", (fullPriceData) => {
      setPriceData(fullPriceData);
      setLastUpdate(new Date());
    });

    // Cleanup on unmount
    return () => {
      socket.disconnect();
    };
  }, []);

  const cryptos = [
    { symbol: "SOL", name: "Solana", color: "#9945FF", icon: "◎" },
    { symbol: "BTC", name: "Bitcoin", color: "#F7931A", icon: "₿" },
    { symbol: "ETH", name: "Ethereum", color: "#627EEA", icon: "⧫" },
    { symbol: "BNB", name: "BNB", color: "#F3BA2F", icon: "●" },
    { symbol: "DOGE", name: "Dogecoin", color: "#C2A633", icon: "Ð" },
  ];

  return (
    <div
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-md)",
        padding: "18px 22px",
        flex: 1,
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 8,
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 22 }}>📊</span>
          <div>
            <div
              style={{
                color: "var(--text-primary)",
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: 0.5,
                opacity: 0.7,
              }}
            >
              Live Prices
            </div>
          </div>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          <div
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: isConnected ? "var(--accent-green)" : "var(--text-faint)",
              boxShadow: isConnected ? "0 0 6px var(--accent-green)" : "none",
              animation: isConnected ? "pulse-dot 2s ease-in-out infinite" : "none",
            }}
          />
          <span
            style={{
              color: "var(--text-faint)",
              fontSize: 9,
              fontWeight: 600,
              letterSpacing: 0.5,
            }}
          >
            {isConnected ? "LIVE" : "OFFLINE"}
          </span>
        </div>
      </div>

      {/* Price rows */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 6,
          overflowY: "auto",
          flex: 1,
          minHeight: 0,
          paddingRight: 4,
          marginTop: 4,
        }}
        className="price-widget-scroll"
      >
        {cryptos.map((crypto) => {
          const data = priceData[crypto.symbol];
          const price = data?.price;
          const percentChange1h = data?.percentChange1h;
          const formattedPrice = price
            ? price < 1
              ? `$${price.toFixed(4)}`
              : `$${price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            : "---";

          const changeColor = percentChange1h >= 0 ? "var(--accent-green)" : "#ef4444";
          const changeSign = percentChange1h >= 0 ? "+" : "";
          const formattedChange =
            percentChange1h !== undefined ? `${changeSign}${percentChange1h.toFixed(2)}%` : "---";

          return (
            <div
              key={crypto.symbol}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "6px 8px",
                background: "var(--bg-elevated)",
                borderRadius: "var(--radius-sm)",
                border: `1px solid ${crypto.color}11`,
                transition: "all 0.2s",
                flexShrink: 0,
              }}
            >
              {/* Left: Icon + Name */}
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: "50%",
                    background: `${crypto.color}22`,
                    border: `1px solid ${crypto.color}44`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 11,
                    color: crypto.color,
                    fontWeight: 700,
                  }}
                >
                  {crypto.icon}
                </div>
                <div>
                  <div
                    style={{
                      color: crypto.color,
                      fontSize: 11,
                      fontWeight: 700,
                      fontFamily: "var(--font-mono)",
                      letterSpacing: 0.5,
                    }}
                  >
                    {crypto.symbol}
                  </div>
                  <div
                    style={{
                      color: "var(--text-faint)",
                      fontSize: 8,
                      marginTop: 1,
                    }}
                  >
                    {crypto.name}
                  </div>
                </div>
              </div>

              {/* Right: Price + 1h% */}
              <div style={{ textAlign: "right" }}>
                <div
                  style={{
                    color: "var(--text-primary)",
                    fontSize: 11,
                    fontWeight: 700,
                    fontFamily: "var(--font-mono)",
                    letterSpacing: 0.3,
                  }}
                >
                  {formattedPrice}
                </div>
                <div
                  style={{
                    color: changeColor,
                    fontSize: 9,
                    fontWeight: 600,
                    fontFamily: "var(--font-mono)",
                    marginTop: 1,
                  }}
                >
                  {formattedChange} 1h
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      {lastUpdate && (
        <div
          style={{
            marginTop: 8,
            paddingTop: 6,
            borderTop: "1px solid var(--border)",
            color: "var(--text-faint)",
            fontSize: 8,
            textAlign: "center",
            flexShrink: 0,
          }}
        >
          Updated {lastUpdate.toLocaleTimeString()}
        </div>
      )}
    </div>
  );
}
