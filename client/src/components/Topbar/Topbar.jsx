import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const NAV = [
  { to: '/',           label: 'Dashboard', icon: '⬡' },
  { to: '/executions', label: 'History',   icon: '◎' },
  { to: '/profile',    label: 'Profile',   icon: '👤' },
]

export default function Topbar({
  workflowName,
  setWorkflowName,
  onActivate,
  isActive,
  nodeCount,
  edgeCount,
  isBuilder,
  onNavigateToDashboard,
  hasUnsavedChanges,
}) {
  const location = useLocation();
  const { user, logout } = useAuth();

  return (
    <header
      style={{
        height: 52,
        background: "var(--bg-surface)",
        borderBottom: "1px solid var(--border)",
        display: "flex",
        alignItems: "center",
        gap: 0,
        flexShrink: 0,
        zIndex: 100,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "0 20px",
          borderRight: "1px solid var(--border)",
          height: "100%",
        }}
      >
        <div
          style={{
            width: 30,
            height: 30,
            borderRadius: 8,
            background: "linear-gradient(135deg, #f59e0b, #ef4444)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 16,
            flexShrink: 0,
          }}
        >
          ⚡
        </div>
        <span
          style={{
            color: "var(--text-primary)",
            fontFamily: "var(--font-display)",
            fontWeight: 800,
            fontSize: 15,
            letterSpacing: 2,
          }}
        >
          TRADEFLOW
        </span>
      </div>

      {!isBuilder && (
        <nav
          style={{
            display: "flex",
            height: "100%",
            borderRight: "1px solid var(--border)",
          }}
        >
          {NAV.map(({ to, label, icon }) => {
            const active = location.pathname === to;
            return (
              <Link
                key={to}
                to={to}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "0 18px",
                  color: active
                    ? "var(--accent-yellow)"
                    : "var(--text-secondary)",
                  fontSize: 12,
                  fontWeight: active ? 600 : 400,
                  borderBottom: active
                    ? "2px solid var(--accent-yellow)"
                    : "2px solid transparent",
                  transition: "color 0.15s",
                }}
              >
                <span>{icon}</span> {label}
              </Link>
            );
          })}
        </nav>
      )}

      {isBuilder && (
        <>
          <div
            style={{
              padding: "0 16px",
              borderRight: "1px solid var(--border)",
              height: "100%",
              display: "flex",
              alignItems: "center",
            }}
          >
            <button
              onClick={onNavigateToDashboard}
              style={{
                background: "none",
                border: "none",
                color: hasUnsavedChanges ? "var(--accent-yellow)" : "var(--text-secondary)",
                fontSize: 11,
                cursor: "pointer",
                padding: 0,
                fontFamily: "inherit",
              }}
            >
              ← Dashboard{hasUnsavedChanges ? " (unsaved)" : ""}
            </button>
          </div>
          <div
            style={{
              padding: "0 16px",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span style={{ color: "var(--text-secondary)", fontSize: 11 }}>
              ◎
            </span>
            <input
              value={workflowName}
              onChange={(e) => setWorkflowName?.(e.target.value)}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--text-secondary)",
                fontSize: 13,
                width: 220,
              }}
            />
          </div>
          <div
            style={{
              display: "flex",
              gap: 20,
              padding: "0 16px",
              borderLeft: "1px solid var(--border)",
            }}
          >
            {[
              { label: "NODES", val: nodeCount, color: "var(--accent-blue)" },
              { label: "EDGES", val: edgeCount, color: "var(--accent-green)" },
            ].map((s) => (
              <div key={s.label} style={{ textAlign: "center" }}>
                <div style={{ color: s.color, fontSize: 15, fontWeight: 700 }}>
                  {s.val}
                </div>
                <div
                  style={{
                    color: "var(--text-primary)",
                    fontSize: 9,
                    letterSpacing: 1,
                    fontWeight: 600,
                    opacity: 0.8,
                  }}
                >
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Wallet Balance */}
      <div style={{ padding: '0 16px', borderLeft: '1px solid var(--border)', height: '100%', display: 'flex', alignItems: 'center' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '7px 18px',
          background: 'linear-gradient(135deg, #f59e0b22, #ef444422)',
          border: '1px solid var(--accent-yellow)',
          borderRadius: 'var(--radius-sm)',
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: 1,
          fontFamily: 'var(--font-mono)',
        }}>
          <span>💰</span>
          <span style={{ color: 'var(--accent-yellow)' }}>
            $10,000.00
          </span>
        </div>
      </div>

      {isBuilder && (
        <div
          style={{
            padding: "0 16px",
            borderLeft: "1px solid var(--border)",
            height: "100%",
            display: "flex",
            alignItems: "center",
          }}
        >
          <button
            onClick={onActivate}
            style={{
              background: isActive ? "#14532d" : "transparent",
              border: `1px solid ${isActive ? "var(--accent-green)" : "var(--accent-yellow)"}`,
              color: isActive ? "var(--accent-green)" : "var(--accent-yellow)",
              padding: "7px 22px",
              borderRadius: "var(--radius-sm)",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 1,
              cursor: "pointer",
              transition: "all 0.2s",
              fontFamily: "var(--font-mono)",
            }}
          >
            {isActive ? "◼ DEACTIVATE" : "▶ ACTIVATE"}
          </button>
        </div>
      )}

      {!isBuilder && (
        <div
          style={{
            padding: "0 16px",
            borderLeft: "1px solid var(--border)",
            height: "100%",
            display: "flex",
            alignItems: "center",
          }}
        >
          <Link to="/builder/new">
            <button
              style={{
                background: "linear-gradient(135deg, #f59e0b22, #ef444422)",
                border: "1px solid var(--accent-yellow)",
                color: "var(--accent-yellow)",
                padding: "7px 18px",
                borderRadius: "var(--radius-sm)",
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: 1,
                cursor: "pointer",
                fontFamily: "var(--font-mono)",
              }}
            >
              + NEW WORKFLOW
            </button>
          </Link>
        </div>
      )}

      {/* User menu */}
      <div style={{ padding: '0 16px', borderLeft: '1px solid var(--border)', height: '100%', display: 'flex', alignItems: 'center', gap: 10 }}>
        <Link to="/profile" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--accent-blue), var(--accent-green))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 12,
            fontWeight: 700,
            color: '#fff',
            cursor: 'pointer',
          }}>
            {user?.displayName?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            <div
              style={{
                color: "var(--text-secondary)",
                fontSize: 11,
                fontWeight: 500,
              }}
            >
              {user?.displayName || "User"}
            </div>
            <div style={{ color: "var(--text-secondary)", fontSize: 9 }}>
              {user?.email}
            </div>
          </div>
        </Link>
        <button
          onClick={logout}
          style={{
            background: "transparent",
            border: "1px solid var(--border)",
            color: "var(--text-secondary)",
            padding: "5px 12px",
            borderRadius: "var(--radius-sm)",
            fontSize: 10,
            fontWeight: 600,
            cursor: "pointer",
            transition: "all 0.15s",
          }}
          onMouseEnter={(e) => {
            e.target.style.borderColor = "#ef4444";
            e.target.style.color = "#ef4444";
          }}
          onMouseLeave={(e) => {
            e.target.style.borderColor = "var(--border)";
            e.target.style.color = "var(--text-secondary)";
          }}
        >
          Logout
        </button>
      </div>
    </header>
  );
}
