import { useRef, useState, useCallback } from "react";
import { NODE_TYPES } from "../../constants/nodeTypes";
import { genId as generateId } from "../../utils/helpers";
import NodeCard from "./NodeCard";
import EdgeLayer from "./EdgeLayer";

export default function Canvas({
  nodes,
  setNodes,
  edges,
  setEdges,
  addLog,
  isActive,
}) {
  const canvasRef = useRef(null);
  const contentRef = useRef(null);
  const [selected, setSelected] = useState(null);
  const [dragging, setDragging] = useState(null); // { nodeId, ox, oy }
  const [connecting, setConnecting] = useState(null); // { nodeId }
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1); // Zoom level (0.3 - 2)
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 }); // Pan offset
  const [isPanning, setIsPanning] = useState(null); // { startX, startY, startOffsetX, startOffsetY }

  // ── Get canvas-relative coords ─────────────────────────────────────────────
  function canvasCoords(e) {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    // Account for zoom and pan
    const x = (e.clientX - rect.left - panOffset.x) / zoom;
    const y = (e.clientY - rect.top - panOffset.y) / zoom;
    return { x, y };
  }

  // ── Zoom controls ──────────────────────────────────────────────────────────
  function handleZoomIn() {
    setZoom((prev) => Math.min(prev + 0.1, 2));
    addLog("Zoom in", "info");
  }

  function handleZoomOut() {
    setZoom((prev) => Math.max(prev - 0.1, 0.3));
    addLog("Zoom out", "info");
  }

  // ── Mouse wheel zoom ───────────────────────────────────────────────────────
  function handleWheel(e) {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.05 : 0.05;
    setZoom((prev) => Math.max(0.3, Math.min(2, prev + delta)));
  }

  function handleResetView() {
    if (nodes.length === 0) {
      setZoom(1);
      setPanOffset({ x: 0, y: 0 });
      addLog("View reset", "info");
      return;
    }

    // Build a flow-based layout using graph structure
    const nodeMap = new Map(
      nodes.map((n) => [n.id, { ...n, level: -1, processed: false }]),
    );
    const outgoing = new Map(); // nodeId -> [targetIds]
    const incoming = new Map(); // nodeId -> [sourceIds]

    // Build adjacency lists
    nodes.forEach((n) => {
      outgoing.set(n.id, []);
      incoming.set(n.id, []);
    });
    edges.forEach((e) => {
      outgoing.get(e.source)?.push(e.target);
      incoming.get(e.target)?.push(e.source);
    });

    // Find root nodes (nodes with no incoming edges - typically triggers)
    const roots = nodes.filter((n) => incoming.get(n.id).length === 0);

    // If no roots found (circular or all connected), use trigger nodes as roots
    const startNodes =
      roots.length > 0
        ? roots
        : nodes.filter((n) => NODE_TYPES[n.type]?.kind === "trigger");

    // BFS to assign levels
    const queue = startNodes.map((n) => n.id);
    startNodes.forEach((n) => (nodeMap.get(n.id).level = 0));

    while (queue.length > 0) {
      const nodeId = queue.shift();
      const node = nodeMap.get(nodeId);
      const targets = outgoing.get(nodeId) || [];

      targets.forEach((targetId) => {
        const targetNode = nodeMap.get(targetId);
        if (targetNode.level < node.level + 1) {
          targetNode.level = node.level + 1;
          if (!targetNode.processed) {
            queue.push(targetId);
            targetNode.processed = true;
          }
        }
      });
    }

    // Handle any unprocessed nodes (disconnected components)
    nodeMap.forEach((node, id) => {
      if (node.level === -1) {
        node.level = 0;
      }
    });

    // Group nodes by level
    const levels = new Map();
    nodeMap.forEach((node, id) => {
      if (!levels.has(node.level)) {
        levels.set(node.level, []);
      }
      levels.get(node.level).push(node);
    });

    // Layout parameters
    const horizontalGap = 350;
    const verticalGap = 200;
    const startX = 150;
    const startY = 100;

    // Arrange nodes level by level
    const arranged = [];
    const sortedLevels = Array.from(levels.keys()).sort((a, b) => a - b);

    sortedLevels.forEach((levelNum, levelIndex) => {
      const levelNodes = levels.get(levelNum);
      const x = startX + levelIndex * horizontalGap;

      // Calculate total height needed for this level
      const totalHeight = (levelNodes.length - 1) * verticalGap;
      const centerOffsetY = -totalHeight / 2;

      levelNodes.forEach((node, i) => {
        arranged.push({
          ...node,
          x: x,
          y:
            startY +
            centerOffsetY +
            i * verticalGap +
            (levelNodes.length > 3 ? levelIndex * 50 : 0),
        });
      });
    });

    // Calculate bounds to center the layout
    const minX = Math.min(...arranged.map((n) => n.x));
    const maxX = Math.max(...arranged.map((n) => n.x));
    const minY = Math.min(...arranged.map((n) => n.y));
    const maxY = Math.max(...arranged.map((n) => n.y));

    const width = maxX - minX + 220; // 220 is node width
    const height = maxY - minY + 145; // 145 is node height

    // Center in viewport (assuming typical viewport size)
    const viewportWidth = canvasRef.current?.clientWidth || 1200;
    const viewportHeight = canvasRef.current?.clientHeight || 800;

    const offsetX = Math.max(50, (viewportWidth - width) / 2 - minX);
    const offsetY = Math.max(50, (viewportHeight - height) / 2 - minY);

    // Apply centering offset
    arranged.forEach((node) => {
      node.x += offsetX;
      node.y += offsetY;
    });

    setNodes(arranged);
    setZoom(1);
    setPanOffset({ x: 0, y: 0 });
    addLog(`${nodes.length} nodes auto-arranged in flow layout`, "success");
  }

  // ── Drop from sidebar ──────────────────────────────────────────────────────
  function handleDrop(e) {
    e.preventDefault();
    const type = e.dataTransfer.getData("nodeType");
    if (!type || !NODE_TYPES[type]) return;
    const { x, y } = canvasCoords(e);
    const def = NODE_TYPES[type];

    const newNode = {
      id: generateId("node"),
      type,
      x: Math.max(20, x - 110),
      y: Math.max(20, y - 55),
      config: Object.fromEntries(def.fields.map((f) => [f.key, f.default])),
    };
    setNodes((prev) => [...prev, newNode]);
    addLog(
      `Node created → [${def.label}] (${def.kind.toUpperCase()}) at (${Math.round(x)}, ${Math.round(y)})`,
      "success",
    );
  }

  // ── Node mouse down (start drag) ───────────────────────────────────────────
  function handleNodeMouseDown(e, nodeId) {
    if (e.button !== 0) return;
    e.stopPropagation();
    const node = nodes.find((n) => n.id === nodeId);
    const { x, y } = canvasCoords(e);
    setDragging({ nodeId, ox: x - node.x, oy: y - node.y });
  }

  // ── Node click (select) ────────────────────────────────────────────────────
  function handleNodeClick(e, nodeId) {
    e.stopPropagation();
    setSelected(nodeId);
  }

  // ── Port mouse down (start connection) ────────────────────────────────────
  function handlePortMouseDown(e, nodeId) {
    e.preventDefault();
    const node = nodes.find((n) => n.id === nodeId);
    setConnecting({ nodeId });
    const { x, y } = canvasCoords(e);
    setMousePos({ x, y });
    addLog(
      `Connecting from [${NODE_TYPES[node.type].label}] — drag to any node's input port (left ●)`,
      "warn",
    );
  }

  // ── Port mouse up (complete connection) ────────────────────────────────────
  function handlePortMouseUp(targetId) {
    if (!connecting) return;
    if (connecting.nodeId === targetId) {
      setConnecting(null);
      return;
    }

    // Prevent duplicate connections
    const alreadyExists = edges.find(
      (e) =>
        (e.source === connecting.nodeId && e.target === targetId) ||
        (e.source === targetId && e.target === connecting.nodeId),
    );
    if (alreadyExists) {
      addLog("Connection already exists between these nodes.", "warn");
      setConnecting(null);
      return;
    }

    const srcNode = nodes.find((n) => n.id === connecting.nodeId);
    const tgtNode = nodes.find((n) => n.id === targetId);
    const newEdge = {
      id: generateId("edge"),
      source: connecting.nodeId,
      target: targetId,
    };
    setEdges((prev) => [...prev, newEdge]);
    addLog(
      `Connected → [${NODE_TYPES[srcNode.type].label}] ──► [${NODE_TYPES[tgtNode.type].label}]`,
      "success",
    );
    setConnecting(null);
  }

  // ── Canvas mouse move ──────────────────────────────────────────────────────
  function handleMouseMove(e) {
    const coords = canvasCoords(e);
    setMousePos(coords);

    // Handle node dragging
    if (dragging) {
      setNodes((prev) =>
        prev.map((n) =>
          n.id === dragging.nodeId
            ? { ...n, x: coords.x - dragging.ox, y: coords.y - dragging.oy }
            : n,
        ),
      );
    }

    // Handle canvas panning
    if (isPanning) {
      const deltaX = e.clientX - isPanning.startX;
      const deltaY = e.clientY - isPanning.startY;
      setPanOffset({
        x: isPanning.startOffsetX + deltaX,
        y: isPanning.startOffsetY + deltaY,
      });
    }
  }

  // ── Canvas mouse down (start panning) ──────────────────────────────────────
  function handleCanvasMouseDown(e) {
    if (e.button !== 0) return;
    // Only start panning if clicking on canvas background (not on nodes)
    if (e.target === canvasRef.current || e.target === contentRef.current) {
      setIsPanning({
        startX: e.clientX,
        startY: e.clientY,
        startOffsetX: panOffset.x,
        startOffsetY: panOffset.y,
      });
    }
  }

  // ── Canvas mouse up ────────────────────────────────────────────────────────
  function handleMouseUp(e) {
    if (dragging) {
      const node = nodes.find((n) => n.id === dragging.nodeId);
      if (node)
        addLog(
          `Node [${NODE_TYPES[node.type].label}] repositioned to (${Math.round(node.x)}, ${Math.round(node.y)})`,
          "info",
        );
      setDragging(null);
    }
    if (connecting) {
      addLog(
        "Connection cancelled — drop on any node's input port (left ●).",
        "warn",
      );
      setConnecting(null);
    }
    if (isPanning) {
      setIsPanning(null);
    }
  }

  // ── Delete selected node ───────────────────────────────────────────────────
  function handleKeyDown(e) {
    if ((e.key === "Delete" || e.key === "Backspace") && selected) {
      const node = nodes.find((n) => n.id === selected);
      if (!node) return;
      setNodes((prev) => prev.filter((n) => n.id !== selected));
      setEdges((prev) =>
        prev.filter((e) => e.source !== selected && e.target !== selected),
      );
      addLog(`Node [${NODE_TYPES[node.type].label}] deleted.`, "error");
      setSelected(null);
    }
  }

  // ── Delete edge ────────────────────────────────────────────────────────────
  function handleDeleteEdge(edgeId) {
    const edge = edges.find((e) => e.id === edgeId);
    if (!edge) return;
    const srcNode = nodes.find((n) => n.id === edge.source);
    const tgtNode = nodes.find((n) => n.id === edge.target);
    setEdges((prev) => prev.filter((e) => e.id !== edgeId));
    addLog(
      `Connection deleted → [${NODE_TYPES[srcNode.type].label}] ✕ [${NODE_TYPES[tgtNode.type].label}]`,
      "warn",
    );
  }

  // ── Config change for a node ───────────────────────────────────────────────
  function handleConfigChange(nodeId, key, value) {
    const node = nodes.find((n) => n.id === nodeId);
    setNodes((prev) =>
      prev.map((n) =>
        n.id === nodeId ? { ...n, config: { ...n.config, [key]: value } } : n,
      ),
    );
    addLog(
      `[${NODE_TYPES[node.type].label}] config updated — ${key}: ${value}`,
      "info",
    );
  }

  return (
    <div
      ref={canvasRef}
      tabIndex={0}
      onMouseMove={handleMouseMove}
      onMouseDown={handleCanvasMouseDown}
      onMouseUp={handleMouseUp}
      onWheel={handleWheel}
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
      onKeyDown={handleKeyDown}
      onClick={() => setSelected(null)}
      style={{
        flex: 1,
        position: "relative",
        overflow: "hidden",
        cursor: isPanning
          ? "grabbing"
          : connecting
            ? "crosshair"
            : dragging
              ? "grabbing"
              : "grab",
        backgroundImage:
          "radial-gradient(circle, #1e2433 1px, transparent 1px)",
        backgroundSize: "28px 28px",
        outline: "none",
      }}
    >
      {/* Zoom controls */}
      <div
        style={{
          position: "absolute",
          top: 16,
          right: 16,
          display: "flex",
          flexDirection: "column",
          gap: 8,
          zIndex: 100,
        }}
      >
        <button
          onClick={handleZoomIn}
          title="Zoom in"
          style={{
            width: 36,
            height: 36,
            background: "var(--bg-elevated)",
            border: "1px solid var(--border)",
            borderRadius: 6,
            color: "var(--text-primary)",
            fontSize: 16,
            fontWeight: 700,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all 0.15s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--bg-surface)";
            e.currentTarget.style.borderColor = "var(--accent-blue)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "var(--bg-elevated)";
            e.currentTarget.style.borderColor = "var(--border)";
          }}
        >
          +
        </button>
        <button
          onClick={handleZoomOut}
          title="Zoom out"
          style={{
            width: 36,
            height: 36,
            background: "var(--bg-elevated)",
            border: "1px solid var(--border)",
            borderRadius: 6,
            color: "var(--text-primary)",
            fontSize: 16,
            fontWeight: 700,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all 0.15s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--bg-surface)";
            e.currentTarget.style.borderColor = "var(--accent-blue)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "var(--bg-elevated)";
            e.currentTarget.style.borderColor = "var(--border)";
          }}
        >
          −
        </button>
        <button
          onClick={handleResetView}
          title="Reset view & arrange nodes"
          style={{
            width: 36,
            height: 36,
            background: "var(--bg-elevated)",
            border: "1px solid var(--border)",
            borderRadius: 6,
            color: "var(--text-primary)",
            fontSize: 16,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all 0.15s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--bg-surface)";
            e.currentTarget.style.borderColor = "var(--accent-green)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "var(--bg-elevated)";
            e.currentTarget.style.borderColor = "var(--border)";
          }}
        >
          ↻
        </button>
        <div
          style={{
            fontSize: 9,
            color: "var(--text-secondary)",
            textAlign: "center",
            marginTop: 4,
            background: "var(--bg-elevated)",
            border: "1px solid var(--border)",
            borderRadius: 4,
            padding: "2px 6px",
          }}
        >
          {Math.round(zoom * 100)}%
        </div>
      </div>

      {/* Canvas content wrapper with zoom transform */}
      <div
        ref={contentRef}
        style={{
          position: "absolute",
          inset: 0,
          transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})`,
          transformOrigin: "0 0",
          transition: isPanning ? "none" : "transform 0.2s ease-out",
        }}
      >
        {/* Empty state */}
        {nodes.length === 0 && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              pointerEvents: "none",
              gap: 12,
            }}
          >
            <div style={{ fontSize: 52, opacity: 0.06 }}>⚡</div>
            <div
              style={{
                color: "#1e2433",
                fontSize: 15,
                fontWeight: 700,
                fontFamily: "var(--font-display)",
              }}
            >
              DRAG NODES FROM THE LEFT PANEL
            </div>
            <div style={{ color: "#161b27", fontSize: 11 }}>
              Start with a Trigger, then connect an Action
            </div>
          </div>
        )}

        {/* SVG edge layer */}
        <EdgeLayer
          nodes={nodes}
          edges={edges}
          connecting={connecting}
          mousePos={mousePos}
          isActive={isActive}
          onDeleteEdge={handleDeleteEdge}
        />

        {/* Node cards */}
        {nodes.map((node) => (
          <NodeCard
            key={node.id}
            node={node}
            selected={selected === node.id}
            onMouseDown={handleNodeMouseDown}
            onClick={handleNodeClick}
            onPortMouseDown={handlePortMouseDown}
            onPortMouseUp={handlePortMouseUp}
            isConnecting={connecting}
            onConfigChange={handleConfigChange}
          />
        ))}
      </div>

      {/* Active badge */}
      {isActive && (
        <div
          style={{
            position: "absolute",
            top: 16,
            left: 16,
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: "#14532d",
            border: "1px solid var(--accent-green)",
            borderRadius: 20,
            padding: "6px 16px",
            zIndex: 50,
          }}
        >
          <div
            style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: "var(--accent-green)",
              boxShadow: "0 0 8px var(--accent-green)",
              animation: "pulse-dot 1.5s ease-in-out infinite",
            }}
          />
          <span
            style={{
              color: "var(--accent-green)",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 1,
            }}
          >
            WORKFLOW ACTIVE
          </span>
        </div>
      )}

      {/* Delete hint */}
      {selected && (
        <div
          style={{
            position: "absolute",
            bottom: 16,
            left: "50%",
            transform: "translateX(-50%)",
            background: "var(--bg-elevated)",
            border: "1px solid var(--border)",
            borderRadius: 20,
            padding: "5px 14px",
            color: "var(--text-secondary)",
            fontSize: 10,
            zIndex: 50,
          }}
        >
          Press{" "}
          <kbd
            style={{
              color: "var(--accent-red)",
              background: "var(--bg-base)",
              padding: "1px 5px",
              borderRadius: 3,
              border: "1px solid #7f1d1d",
            }}
          >
            Delete
          </kbd>{" "}
          to remove selected node
        </div>
      )}
    </div>
  );
}
