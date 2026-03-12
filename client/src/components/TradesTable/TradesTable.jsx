import { useState, useEffect } from "react";
import { positionAPI } from "../../services/api";
import { formatDate } from "../../utils/helpers";
import { io } from "socket.io-client";

function TradesTable() {
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("all"); // all, open, closed

  useEffect(() => {
    loadPositions();

    // Connect to WebSocket for real-time updates
    const socket = io(window.location.origin, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: Infinity,
    });

    socket.on("connect", () => {
      console.log("TradesTable: WebSocket connected");
      setError(null); // Clear any connection errors
    });

    socket.on("connect_error", (err) => {
      console.log("TradesTable: Connection error (will retry):", err.message);
      // Don't set error state - let it retry silently
    });

    socket.on("disconnect", (reason) => {
      console.log("TradesTable: Disconnected:", reason);
      if (reason === "io server disconnect") {
        // Server initiated disconnect, reconnect manually
        socket.connect();
      }
      // For other reasons, socket.io will auto-reconnect
    });

    socket.on("positionOpened", (data) => {
      console.log("Position opened:", data);
      loadPositions(); // Refresh the list
    });

    socket.on("positionClosed", (data) => {
      console.log("Position closed:", data);
      loadPositions(); // Refresh the list
    });

    socket.on("positionLiquidated", (data) => {
      console.log("Position liquidated:", data);
      loadPositions(); // Refresh the list
    });

    // Update unrealized PnL on price updates
    socket.on("priceUpdate", (priceMap) => {
      setPositions((prev) =>
        prev.map((pos) => {
          if (pos.status === "open" && priceMap[pos.symbol]) {
            const currentPrice = priceMap[pos.symbol].price;
            const entryPrice = pos.entryPrice;
            const sizeInUSD = pos.size;
            const leverage = pos.leverage;

            let unrealizedPnL = 0;
            if (pos.type === "long") {
              unrealizedPnL = (sizeInUSD / entryPrice) * (currentPrice - entryPrice);
            } else {
              unrealizedPnL = (sizeInUSD / entryPrice) * (entryPrice - currentPrice);
            }

            const unrealizedPnLPercent = (unrealizedPnL / (sizeInUSD / leverage)) * 100;

            return {
              ...pos,
              currentPrice,
              unrealizedPnL,
              unrealizedPnLPercent,
            };
          }
          return pos;
        })
      );
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const loadPositions = async () => {
    try {
      setLoading(true);
      setError(null);

      let response;
      if (filter === "open") {
        response = await positionAPI.getOpen();
      } else if (filter === "closed") {
        response = await positionAPI.getClosed({ limit: 20 });
      } else {
        response = await positionAPI.getAll({ limit: 20 });
      }

      setPositions(response.data.data || []);
    } catch (err) {
      console.error("Error loading positions:", err);
      setError(err.message || "Failed to load positions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPositions();
  }, [filter]);

  const getStatusColor = (status) => {
    switch (status) {
      case "open":
        return "var(--accent-blue)";
      case "closed":
        return "var(--accent-green)";
      case "liquidated":
        return "var(--accent-red)";
      default:
        return "var(--text-secondary)";
    }
  };

  const getTypeColor = (type) => {
    return type === "long" ? "var(--accent-green)" : "var(--accent-red)";
  };

  if (loading && positions.length === 0) {
    return (
      <div
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-md)",
          padding: 40,
          textAlign: "center",
        }}
      >
        <div
          style={{
            color: "var(--text-secondary)",
            fontSize: 14,
            animation: "pulse 1.5s ease-in-out infinite",
          }}
        >
          Loading trades...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--accent-red)",
          borderRadius: "var(--radius-md)",
          padding: 20,
        }}
      >
        <div style={{ color: "var(--accent-red)", fontSize: 14, marginBottom: 8 }}>
          ⚠ Error loading trades
        </div>
        <div style={{ color: "var(--text-secondary)", fontSize: 12 }}>{error}</div>
        <button
          onClick={loadPositions}
          style={{
            marginTop: 12,
            background: "var(--accent-red)",
            color: "white",
            border: "none",
            padding: "8px 16px",
            borderRadius: "var(--radius-sm)",
            cursor: "pointer",
            fontSize: 12,
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  if (positions.length === 0) {
    return (
      <div
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-md)",
          padding: 40,
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 40, marginBottom: 12 }}>📊</div>
        <div style={{ color: "var(--text-primary)", fontSize: 14, marginBottom: 6 }}>
          No trades yet
        </div>
        <div style={{ color: "var(--text-secondary)", fontSize: 12 }}>
          {filter === "open" && "No open positions at the moment"}
          {filter === "closed" && "No closed positions yet"}
          {filter === "all" && "Create a workflow with long/short nodes to start trading"}
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-md)",
        overflow: "hidden",
      }}
    >
      {/* Header with filters */}
      <div
        style={{
          padding: "16px 20px",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <h3
          style={{
            color: "var(--text-primary)",
            fontSize: 15,
            fontFamily: "var(--font-display)",
            fontWeight: 700,
          }}
        >
          💱 Recent Trades
        </h3>
        <div style={{ display: "flex", gap: 6 }}>
          {["all", "open", "closed"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                background: filter === f ? "var(--accent-blue)" : "var(--bg-elevated)",
                border: `1px solid ${filter === f ? "var(--accent-blue)" : "var(--border)"}`,
                color: filter === f ? "white" : "var(--text-secondary)",
                padding: "4px 12px",
                borderRadius: "var(--radius-sm)",
                fontSize: 10,
                cursor: "pointer",
                textTransform: "uppercase",
                fontWeight: 600,
                transition: "all 0.2s",
              }}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "var(--bg-elevated)" }}>
              <th style={thStyle}>Type</th>
              <th style={thStyle}>Symbol</th>
              <th style={thStyle}>Entry</th>
              <th style={thStyle}>Current/Exit</th>
              <th style={thStyle}>Size</th>
              <th style={thStyle}>Leverage</th>
              <th style={thStyle}>PnL</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Time</th>
            </tr>
          </thead>
          <tbody>
            {positions.map((pos) => {
              const pnl = pos.status === "open" ? pos.unrealizedPnL : pos.realizedPnL;
              const pnlPercent =
                pos.status === "open" ? pos.unrealizedPnLPercent : pos.realizedPnLPercent;
              const isProfit = pnl >= 0;

              return (
                <tr
                  key={pos._id}
                  style={{
                    borderBottom: "1px solid var(--border)",
                    transition: "background 0.2s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-elevated)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <td style={tdStyle}>
                    <span
                      style={{
                        color: getTypeColor(pos.type),
                        fontWeight: 700,
                        fontSize: 11,
                        textTransform: "uppercase",
                      }}
                    >
                      {pos.type === "long" ? "↑ LONG" : "↓ SHORT"}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    <span style={{ fontWeight: 600 }}>{pos.symbol}</span>
                  </td>
                  <td style={tdStyle}>${pos.entryPrice?.toFixed(2)}</td>
                  <td style={tdStyle}>
                    {pos.status === "open" ? (
                      <span style={{ color: "var(--accent-blue)" }}>
                        ${pos.currentPrice?.toFixed(2)}
                      </span>
                    ) : (
                      `$${pos.exitPrice?.toFixed(2)}`
                    )}
                  </td>
                  <td style={tdStyle}>${pos.size?.toFixed(2)}</td>
                  <td style={tdStyle}>
                    <span
                      style={{
                        background: "var(--accent-purple)22",
                        color: "var(--accent-purple)",
                        padding: "2px 8px",
                        borderRadius: 4,
                        fontSize: 10,
                        fontWeight: 700,
                      }}
                    >
                      {pos.leverage}x
                    </span>
                  </td>
                  <td style={tdStyle}>
                    <div>
                      <div
                        style={{
                          color: isProfit ? "var(--accent-green)" : "var(--accent-red)",
                          fontWeight: 700,
                          fontSize: 12,
                        }}
                      >
                        {isProfit ? "+" : ""}${pnl?.toFixed(2)}
                      </div>
                      <div
                        style={{
                          color: isProfit ? "var(--accent-green)" : "var(--accent-red)",
                          fontSize: 10,
                          opacity: 0.8,
                        }}
                      >
                        {isProfit ? "+" : ""}
                        {pnlPercent?.toFixed(2)}%
                      </div>
                    </div>
                  </td>
                  <td style={tdStyle}>
                    <span
                      style={{
                        color: getStatusColor(pos.status),
                        fontSize: 10,
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: 0.5,
                      }}
                    >
                      {pos.status === "open" && "● "}
                      {pos.status}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    <span style={{ fontSize: 10, color: "var(--text-secondary)" }}>
                      {formatDate(pos.openedAt)}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const thStyle = {
  padding: "10px 12px",
  textAlign: "left",
  color: "var(--text-secondary)",
  fontSize: 10,
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: 1,
};

const tdStyle = {
  padding: "12px",
  color: "var(--text-primary)",
  fontSize: 12,
};

export default TradesTable;
