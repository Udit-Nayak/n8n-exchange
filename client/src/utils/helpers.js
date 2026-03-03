import { NODE_TYPES } from '../constants/nodeTypes'

// ─── ID generation ────────────────────────────────────────────────────────────
export function genId(prefix = "id") {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

// ─── Timestamp ────────────────────────────────────────────────────────────────
export function timestamp() {
  return new Date().toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

// ─── Date format for display ──────────────────────────────────────────────────
export function formatDate(dateStr) {
  return new Date(dateStr).toLocaleString("en-US", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ─── Bezier path for SVG edges ────────────────────────────────────────────────
export function bezierPath(x1, y1, x2, y2) {
  const cx = (x1 + x2) / 2;
  return `M ${x1} ${y1} C ${cx} ${y1}, ${cx} ${y2}, ${x2} ${y2}`;
}

// ─── Clamp value within range ─────────────────────────────────────────────────
export function clamp(val, min, max) {
  return Math.min(Math.max(val, min), max);
}

// ─── Get port position for a node ────────────────────────────────────────────
// kind: 'out' = right side (trigger), 'in' = left side (action)
// Ports are 18px circles positioned with CSS left/right: -10, top: 50%
export function getPortPos(node, kind, nodeWidth = 220) {
  if (!node) return { x: 0, y: 0 };

  // Calculate actual node height based on number of fields
  // Header: ~45px, Config padding: ~20px, Each field: ~35px, Gap between fields: ~6px
  const nodeDef = NODE_TYPES[node.type];
  const numFields = nodeDef?.fields?.length || 2; // Default to 2 if not found
  const headerHeight = 52;
  const configPadding = 20;
  const fieldHeight = 35;
  const gapHeight = 6;
  const nodeHeight = headerHeight + configPadding + (numFields * fieldHeight) + ((numFields - 1) * gapHeight);

  // Right port (output): right: -10 means extends 10px beyond node's right edge
  // Port is 18px wide, so center is at: node.x + 230 - 9 = node.x + 221
  if (kind === "out") {
    return { x: node.x + 221, y: node.y + nodeHeight / 2 };
  }

  // Left port (input): left: -10 means extends 10px before node's left edge
  // Port is 18px wide, so center is at: node.x - 10 + 9 = node.x - 1
  return { x: node.x - 1, y: node.y + nodeHeight / 2 };
}
