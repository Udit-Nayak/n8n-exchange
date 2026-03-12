import { useState, useEffect } from "react";
import { positionAPI } from "../services/api";
import Topbar from "../components/Topbar/Topbar";
import { formatDate } from "../utils/helpers";

function TradeHistory() {
  const [positions, setPositions] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [filters, setFilters] = useState({
    status: "all", // all, open, closed, liquidated
    symbol: "all", // all, BTC, ETH
    type: "all", // all, long, short
    sortBy: "newest", // newest, oldest, profitHigh, profitLow
  });

  const [pagination, setPagination] = useState({
    limit: 50,
    offset: 0,
    total: 0,
    hasMore: false,
  });

  useEffect(() => {
    loadData();
  }, [filters, pagination.offset]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Build query params
      const params = {
        limit: pagination.limit,
        offset: pagination.offset,
      };

      if (filters.status !== "all") {
        params.status = filters.status;
      }

      if (filters.symbol !== "all") {
        params.symbol = filters.symbol;
      }

      if (filters.type !== "all") {
        params.type = filters.type;
      }

      // Fetch positions
      const positionsResponse = await positionAPI.getAll(params);
      let fetchedPositions = positionsResponse.data.data || [];

      // Sort positions
      if (filters.sortBy === "oldest") {
        fetchedPositions = [...fetchedPositions].reverse();
      } else if (filters.sortBy === "profitHigh") {
        fetchedPositions = [...fetchedPositions].sort((a, b) => {
          const pnlA = a.realizedPnL || a.unrealizedPnL || 0;
          const pnlB = b.realizedPnL || b.unrealizedPnL || 0;
          return pnlB - pnlA;
        });
      } else if (filters.sortBy === "profitLow") {
        fetchedPositions = [...fetchedPositions].sort((a, b) => {
          const pnlA = a.realizedPnL || a.unrealizedPnL || 0;
          const pnlB = b.realizedPnL || b.unrealizedPnL || 0;
          return pnlA - pnlB;
        });
      }

      setPositions(fetchedPositions);
      setPagination((prev) => ({
        ...prev,
        total: positionsResponse.data.pagination?.total || 0,
        hasMore: positionsResponse.data.pagination?.hasMore || false,
      }));

      // Fetch stats
      const statsResponse = await positionAPI.getStats();
      setStats(statsResponse.data.data);
    } catch (err) {
      console.error("Error loading trade history:", err);
      setError(err.message || "Failed to load trade history");
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPagination((prev) => ({ ...prev, offset: 0 }));
  };

  const loadMore = () => {
    setPagination((prev) => ({
      ...prev,
      offset: prev.offset + prev.limit,
    }));
  };

  const loadPrevious = () => {
    setPagination((prev) => ({
      ...prev,
      offset: Math.max(0, prev.offset - prev.limit),
    }));
  };

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

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-base)" }}>
      <Topbar />

      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "30px 24px" }}>
        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <h1
            style={{
              color: "var(--text-primary)",
              fontSize: 28,
              fontFamily: "var(--font-display)",
              fontWeight: 800,
              marginBottom: 8,
            }}
          >
            📊 Trade History
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>
            View and analyze your trading activity
          </p>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: 16,
              marginBottom: 24,
            }}
          >
            <StatCard
              label="Total Trades"
              value={stats.totalPositions}
              color="var(--accent-blue)"
            />
            <StatCard
              label="Open Positions"
              value={stats.openPositions}
              color="var(--accent-purple)"
            />
            <StatCard
              label="Win Rate"
              value={`${stats.winRate.toFixed(1)}%`}
              color="var(--accent-green)"
            />
            <StatCard
              label="Total Realized PnL"
              value={`$${stats.totalRealizedPnL.toFixed(2)}`}
              color={stats.totalRealizedPnL >= 0 ? "var(--accent-green)" : "var(--accent-red)"}
            />
            <StatCard
              label="Winning Trades"
              value={stats.winningTrades}
              color="var(--accent-green)"
            />
            <StatCard label="Losing Trades" value={stats.losingTrades} color="var(--accent-red)" />
          </div>
        )}

        {/* Filters */}
        <div
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-md)",
            padding: 20,
            marginBottom: 24,
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: 16,
            }}
          >
            <FilterSelect
              label="Status"
              value={filters.status}
              onChange={(v) => handleFilterChange("status", v)}
              options={[
                { value: "all", label: "All" },
                { value: "open", label: "Open" },
                { value: "closed", label: "Closed" },
                { value: "liquidated", label: "Liquidated" },
              ]}
            />
            <FilterSelect
              label="Symbol"
              value={filters.symbol}
              onChange={(v) => handleFilterChange("symbol", v)}
              options={[
                { value: "all", label: "All" },
                { value: "BTC", label: "Bitcoin (BTC)" },
                { value: "ETH", label: "Ethereum (ETH)" },
              ]}
            />
            <FilterSelect
              label="Type"
              value={filters.type}
              onChange={(v) => handleFilterChange("type", v)}
              options={[
                { value: "all", label: "All" },
                { value: "long", label: "Long" },
                { value: "short", label: "Short" },
              ]}
            />
            <FilterSelect
              label="Sort By"
              value={filters.sortBy}
              onChange={(v) => handleFilterChange("sortBy", v)}
              options={[
                { value: "newest", label: "Newest First" },
                { value: "oldest", label: "Oldest First" },
                { value: "profitHigh", label: "Highest Profit" },
                { value: "profitLow", label: "Lowest Profit" },
              ]}
            />
          </div>
        </div>

        {/* Positions Table */}
        {loading && positions.length === 0 ? (
          <LoadingState />
        ) : error ? (
          <ErrorState error={error} onRetry={loadData} />
        ) : positions.length === 0 ? (
          <EmptyState />
        ) : (
          <div
            style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-md)",
              overflow: "hidden",
            }}
          >
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "var(--bg-elevated)" }}>
                    <th style={thStyle}>Type</th>
                    <th style={thStyle}>Symbol</th>
                    <th style={thStyle}>Entry Price</th>
                    <th style={thStyle}>Exit/Current</th>
                    <th style={thStyle}>Size</th>
                    <th style={thStyle}>Leverage</th>
                    <th style={thStyle}>Collateral</th>
                    <th style={thStyle}>PnL</th>
                    <th style={thStyle}>PnL %</th>
                    <th style={thStyle}>Status</th>
                    <th style={thStyle}>Opened</th>
                    <th style={thStyle}>Closed</th>
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
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.background = "var(--bg-elevated)")
                        }
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
                          <span style={{ fontWeight: 600, fontSize: 13 }}>{pos.symbol}</span>
                        </td>
                        <td style={tdStyle}>${pos.entryPrice?.toFixed(2)}</td>
                        <td style={tdStyle}>
                          {pos.status === "open" ? (
                            <span style={{ color: "var(--accent-blue)", fontWeight: 600 }}>
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
                              padding: "3px 10px",
                              borderRadius: 6,
                              fontSize: 11,
                              fontWeight: 700,
                            }}
                          >
                            {pos.leverage}x
                          </span>
                        </td>
                        <td style={tdStyle}>${pos.collateral?.toFixed(2)}</td>
                        <td style={tdStyle}>
                          <span
                            style={{
                              color: isProfit ? "var(--accent-green)" : "var(--accent-red)",
                              fontWeight: 700,
                              fontSize: 13,
                            }}
                          >
                            {isProfit ? "+" : ""}${pnl?.toFixed(2)}
                          </span>
                        </td>
                        <td style={tdStyle}>
                          <span
                            style={{
                              color: isProfit ? "var(--accent-green)" : "var(--accent-red)",
                              fontWeight: 600,
                              fontSize: 12,
                            }}
                          >
                            {isProfit ? "+" : ""}
                            {pnlPercent?.toFixed(2)}%
                          </span>
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
                          <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>
                            {formatDate(pos.openedAt)}
                          </span>
                        </td>
                        <td style={tdStyle}>
                          <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>
                            {pos.closedAt ? formatDate(pos.closedAt) : "-"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div
              style={{
                padding: 20,
                borderTop: "1px solid var(--border)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div style={{ color: "var(--text-secondary)", fontSize: 12 }}>
                Showing {pagination.offset + 1} -{" "}
                {Math.min(pagination.offset + pagination.limit, pagination.total)} of{" "}
                {pagination.total}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={loadPrevious}
                  disabled={pagination.offset === 0}
                  style={{
                    background: "var(--bg-elevated)",
                    border: "1px solid var(--border)",
                    color: "var(--text-secondary)",
                    padding: "6px 14px",
                    borderRadius: "var(--radius-sm)",
                    fontSize: 11,
                    cursor: pagination.offset === 0 ? "not-allowed" : "pointer",
                    opacity: pagination.offset === 0 ? 0.5 : 1,
                  }}
                >
                  ← Previous
                </button>
                <button
                  onClick={loadMore}
                  disabled={!pagination.hasMore}
                  style={{
                    background: "var(--bg-elevated)",
                    border: "1px solid var(--border)",
                    color: "var(--text-secondary)",
                    padding: "6px 14px",
                    borderRadius: "var(--radius-sm)",
                    fontSize: 11,
                    cursor: !pagination.hasMore ? "not-allowed" : "pointer",
                    opacity: !pagination.hasMore ? 0.5 : 1,
                  }}
                >
                  Next →
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, color }) {
  return (
    <div
      style={{
        background: "var(--bg-surface)",
        border: `1px solid ${color}33`,
        borderRadius: "var(--radius-md)",
        padding: 20,
        textAlign: "center",
      }}
    >
      <div
        style={{
          color,
          fontSize: 24,
          fontWeight: 800,
          fontFamily: "var(--font-display)",
          marginBottom: 6,
        }}
      >
        {value}
      </div>
      <div
        style={{
          color: "var(--text-secondary)",
          fontSize: 11,
          textTransform: "uppercase",
          fontWeight: 600,
          letterSpacing: 0.5,
        }}
      >
        {label}
      </div>
    </div>
  );
}

function FilterSelect({ label, value, onChange, options }) {
  return (
    <div>
      <label
        style={{
          display: "block",
          color: "var(--text-secondary)",
          fontSize: 11,
          marginBottom: 6,
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: 0.5,
        }}
      >
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: "100%",
          background: "var(--bg-elevated)",
          border: "1px solid var(--border)",
          color: "var(--text-primary)",
          padding: "8px 12px",
          borderRadius: "var(--radius-sm)",
          fontSize: 13,
          cursor: "pointer",
        }}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function LoadingState() {
  return (
    <div
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-md)",
        padding: 60,
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
        Loading trade history...
      </div>
    </div>
  );
}

function ErrorState({ error, onRetry }) {
  return (
    <div
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--accent-red)",
        borderRadius: "var(--radius-md)",
        padding: 40,
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
      <div style={{ color: "var(--accent-red)", fontSize: 16, marginBottom: 8 }}>
        Error loading trade history
      </div>
      <div style={{ color: "var(--text-secondary)", fontSize: 13, marginBottom: 20 }}>{error}</div>
      <button
        onClick={onRetry}
        style={{
          background: "var(--accent-red)",
          color: "white",
          border: "none",
          padding: "10px 20px",
          borderRadius: "var(--radius-sm)",
          cursor: "pointer",
          fontSize: 13,
          fontWeight: 600,
        }}
      >
        Retry
      </button>
    </div>
  );
}

function EmptyState() {
  return (
    <div
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-md)",
        padding: 60,
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: 60, marginBottom: 16 }}>📊</div>
      <div
        style={{
          color: "var(--text-primary)",
          fontSize: 18,
          fontWeight: 600,
          marginBottom: 8,
        }}
      >
        No trades found
      </div>
      <div style={{ color: "var(--text-secondary)", fontSize: 14 }}>
        Try adjusting your filters or create a trading workflow to get started
      </div>
    </div>
  );
}

const thStyle = {
  padding: "14px 16px",
  textAlign: "left",
  color: "var(--text-secondary)",
  fontSize: 10,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: 1,
};

const tdStyle = {
  padding: "16px",
  color: "var(--text-primary)",
  fontSize: 12,
};

export default TradeHistory;
