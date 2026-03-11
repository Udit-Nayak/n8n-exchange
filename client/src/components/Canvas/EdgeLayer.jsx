import { useState } from "react";
import { NODE_TYPES } from "../../constants/nodeTypes";
import { bezierPath, getPortPos } from "../../utils/helpers";

export default function EdgeLayer({ nodes, edges, connecting, mousePos, isActive, onDeleteEdge }) {
  const [hoveredEdge, setHoveredEdge] = useState(null);

  function getSrcNode(nodeId) {
    return nodes.find((n) => n.id === nodeId);
  }

  return (
    <svg
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        overflow: "visible",
        zIndex: 3,
      }}
    >
      <defs>
        {/* Arrow markers for all node type colors */}
        {Object.entries(NODE_TYPES).map(([type, def]) => (
          <marker
            key={type}
            id={`arrow-${type}`}
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill={def.color} />
          </marker>
        ))}
        <marker
          id="arrow-connecting"
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#f59e0b" />
        </marker>
      </defs>

      {/* ── Existing edges ── */}
      {edges.map((edge) => {
        const srcNode = getSrcNode(edge.source);
        const tgtNode = getSrcNode(edge.target);
        if (!srcNode || !tgtNode) return null;
        const def = NODE_TYPES[srcNode.type];
        if (!def) return null;

        const src = getPortPos(srcNode, "out");
        const tgt = getPortPos(tgtNode, "in");
        const path = bezierPath(src.x, src.y, tgt.x, tgt.y);
        const isHovered = hoveredEdge === edge.id;

        // Calculate midpoint for delete button
        const midX = (src.x + tgt.x) / 2;
        const midY = (src.y + tgt.y) / 2;

        return (
          <g key={edge.id}>
            {/* Invisible hit area for hover detection */}
            <path
              d={path}
              stroke="transparent"
              strokeWidth={20}
              fill="none"
              style={{ pointerEvents: "stroke", cursor: "pointer" }}
              onMouseEnter={() => setHoveredEdge(edge.id)}
              onMouseLeave={() => setHoveredEdge(null)}
            />
            {/* Glow layer */}
            <path
              d={path}
              stroke={def.color}
              strokeWidth={isHovered ? 8 : 6}
              fill="none"
              opacity={isHovered ? 0.25 : 0.12}
              style={{ pointerEvents: "none", transition: "all 0.2s" }}
            />
            {/* Main line */}
            <path
              d={path}
              stroke={def.color}
              strokeWidth={isHovered ? 2.5 : 1.8}
              fill="none"
              strokeDasharray={isActive ? "8 4" : "6 5"}
              markerEnd={`url(#arrow-${srcNode.type})`}
              style={{
                pointerEvents: "none",
                transition: "stroke-width 0.2s",
                animation: isActive ? "flow 0.8s linear infinite" : "none",
              }}
            />
            {/* Delete button */}
            {isHovered && (
              <g
                style={{ cursor: "pointer" }}
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteEdge(edge.id);
                }}
                onMouseEnter={() => setHoveredEdge(edge.id)}
              >
                {/* Background circle */}
                <circle
                  cx={midX}
                  cy={midY}
                  r={14}
                  fill="var(--bg-surface)"
                  stroke="#ef4444"
                  strokeWidth={2}
                  style={{ pointerEvents: "all" }}
                />
                {/* Dustbin icon using path */}
                <g transform={`translate(${midX - 6}, ${midY - 6})`}>
                  <path
                    d="M3 2 L9 2 M5 0 L7 0 M2 3 L10 3 M3 4 L3 10 C3 10.5 3.5 11 4 11 L8 11 C8.5 11 9 10.5 9 10 L9 4 M5 5 L5 9 M7 5 L7 9"
                    stroke="#ef4444"
                    strokeWidth={1.2}
                    fill="none"
                    strokeLinecap="round"
                    style={{ pointerEvents: "none" }}
                  />
                </g>
              </g>
            )}
          </g>
        );
      })}

      {/* ── In-progress connection line ── */}
      {connecting &&
        (() => {
          const srcNode = getSrcNode(connecting.nodeId);
          if (!srcNode) return null;
          const src = getPortPos(srcNode, "out");
          const path = bezierPath(src.x, src.y, mousePos.x, mousePos.y);
          return (
            <path
              d={path}
              stroke="#f59e0b"
              strokeWidth={1.5}
              fill="none"
              strokeDasharray="7 4"
              markerEnd="url(#arrow-connecting)"
              opacity={0.8}
            />
          );
        })()}
    </svg>
  );
}
