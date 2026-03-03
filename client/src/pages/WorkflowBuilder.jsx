import { useState, useCallback, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { NODE_TYPES } from "../constants/nodeTypes";
import { genId } from "../utils/helpers";
import { useWorkflow } from "../context/WorkflowContext";
import Topbar from "../components/Topbar/Topbar";
import Sidebar from "../components/Sidebar/Sidebar";
import Canvas from "../components/Canvas/Canvas";
import LogPanel from "../components/LogPanel/LogPanel";
import StatusBar from "../components/StatusBar/StatusBar";

export default function WorkflowBuilder() {
  const { id } = useParams();
  const navigate = useNavigate();
  const {
    workflows,
    addLog: globalLog,
    logs,
    clearLogs,
    saveWorkflow,
  } = useWorkflow();

  // Find existing or start new
  const existing = workflows.find((w) => w.id === id);

  const [workflowName, setWorkflowName] = useState(
    existing?.name || "New Workflow",
  );
  const [nodes, setNodes] = useState(existing?.nodes || []);
  const [edges, setEdges] = useState(existing?.edges || []);
  const [isActive, setIsActive] = useState(existing?.isActive || false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Skip marking as unsaved on initial load
  useEffect(() => {
    if (isInitialLoad) {
      setIsInitialLoad(false);
      return;
    }
    setHasUnsavedChanges(true);
  }, [workflowName, nodes, edges, isInitialLoad]);

  // Warn before closing tab/window with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = ""; // Required for Chrome
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // ── Activation logic with validation ──────────────────────────────────────
  function handleActivate() {
    const triggers = nodes.filter(
      (n) => NODE_TYPES[n.type]?.kind === "trigger",
    );
    const actions = nodes.filter((n) => NODE_TYPES[n.type]?.kind === "action");

    if (nodes.length === 0) {
      globalLog("Cannot activate — canvas is empty. Add nodes first.", "error");
      return;
    }
    if (triggers.length === 0) {
      globalLog("Cannot activate — no Trigger node found.", "error");
      return;
    }
    if (actions.length === 0) {
      globalLog("Cannot activate — no Action node found.", "error");
      return;
    }
    if (edges.length === 0) {
      globalLog(
        "Cannot activate — nodes are not connected. Draw at least one connection.",
        "error",
      );
      return;
    }

    const next = !isActive;
    setIsActive(next);

    if (next) {
      globalLog(`Workflow "${workflowName}" ACTIVATED ✓`, "success");
      globalLog(
        `Monitoring triggers: ${triggers.map((t) => NODE_TYPES[t.type].label).join(", ")}`,
        "system",
      );
      globalLog(
        `Will execute: ${actions.map((a) => NODE_TYPES[a.type].label).join(", ")}`,
        "system",
      );
    } else {
      globalLog(`Workflow "${workflowName}" DEACTIVATED.`, "warn");
    }
  }

  // ── Save workflow ──────────────────────────────────────────────────────────
  function handleSave() {
    const wf = {
      id: id === "new" ? genId("wf") : id,
      name: workflowName,
      nodes,
      edges,
      isActive,
      createdAt: existing?.createdAt || new Date().toISOString(),
      executions: existing?.executions || 0,
      lastRun: existing?.lastRun || null,
    };
    saveWorkflow(wf);
    setHasUnsavedChanges(false);
    if (id === "new") navigate(`/builder/${wf.id}`);
  }

  // ── Handle navigation with unsaved changes check ───────────────────────────
  function handleNavigateToDashboard(e) {
    if (hasUnsavedChanges) {
      const confirmed = window.confirm(
        "You have unsaved changes. Are you sure you want to leave without saving?"
      );
      if (!confirmed) {
        e?.preventDefault();
        return false;
      }
    }
    navigate("/");
    return true;
  }

  // ── Clear canvas ───────────────────────────────────────────────────────────
  function handleClear() {
    setNodes([]);
    setEdges([]);
    setIsActive(false);
    globalLog("Canvas cleared — all nodes and connections removed.", "warn");
  }

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <Topbar
        isBuilder
        workflowName={workflowName}
        setWorkflowName={setWorkflowName}
        onActivate={handleActivate}
        isActive={isActive}
        nodeCount={nodes.length}
        edgeCount={edges.length}
        onNavigateToDashboard={handleNavigateToDashboard}
        hasUnsavedChanges={hasUnsavedChanges}
      />

      {/* Builder toolbar strip */}
      <div
        style={{
          height: 38,
          background: "var(--bg-surface)",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "0 14px",
          flexShrink: 0,
        }}
      >
        <button onClick={handleSave} style={toolBtn("#22c55e")}>
          💾 Save
        </button>
        <button onClick={handleClear} style={toolBtn("#ef4444")}>
          ↺ Clear Canvas
        </button>
        <div style={{ flex: 1 }} />
        <span
          style={{ color: "var(--text-primary)", fontSize: 10, opacity: 0.7 }}
        >
          {nodes.filter((n) => NODE_TYPES[n.type]?.kind === "trigger").length}{" "}
          trigger(s) →{" "}
          {nodes.filter((n) => NODE_TYPES[n.type]?.kind === "action").length}{" "}
          action(s) via {edges.length} connection(s)
        </span>
      </div>

      {/* Main body */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        <Sidebar />
        <Canvas
          nodes={nodes}
          setNodes={setNodes}
          edges={edges}
          setEdges={setEdges}
          addLog={globalLog}
          isActive={isActive}
        />
        <LogPanel logs={logs} onClear={clearLogs} />
      </div>

      <StatusBar
        isActive={isActive}
        nodes={nodes}
        connecting={null}
        dragging={null}
        selectedNodeId={null}
      />
    </div>
  );
}

function toolBtn(color) {
  return {
    background: `${color}18`,
    border: `1px solid ${color}44`,
    color: color,
    padding: "4px 14px",
    borderRadius: "var(--radius-sm)",
    fontSize: 11,
    fontFamily: "var(--font-mono)",
    cursor: "pointer",
    fontWeight: 600,
  };
}
