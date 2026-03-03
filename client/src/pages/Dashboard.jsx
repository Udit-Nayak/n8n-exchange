import { Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useWorkflow } from '../context/WorkflowContext'
import Topbar from '../components/Topbar/Topbar'
import { formatDate, genId } from '../utils/helpers'
import { NODE_TYPES, getDefaultConfig } from '../constants/nodeTypes'

function StatCard({ label, value, color, icon }) {
  return (
    <div
      style={{
        background: "var(--bg-surface)",
        border: `1px solid ${color}33`,
        borderRadius: "var(--radius-md)",
        padding: "18px 22px",
        flex: 1,
      }}
    >
      <div style={{ fontSize: 22, marginBottom: 8 }}>{icon}</div>
      <div
        style={{
          color,
          fontSize: 28,
          fontWeight: 700,
          fontFamily: "var(--font-display)",
        }}
      >
        {value}
      </div>
      <div
        style={{
          color: "var(--text-primary)",
          fontSize: 11,
          marginTop: 4,
          opacity: 0.7,
        }}
      >
        {label}
      </div>
    </div>
  );
}

function WorkflowCard({ workflow, onToggle, onDeleteClick }) {
  const isActive = workflow.isActive

  return (
    <div
      style={{
        background: "var(--bg-surface)",
        border: `1px solid ${isActive ? "var(--accent-green)33" : "var(--border)"}`,
        borderRadius: "var(--radius-md)",
        padding: 20,
        display: "flex",
        flexDirection: "column",
        gap: 12,
        transition: "border-color 0.2s",
        animation: "fadeIn 0.2s ease",
      }}
    >
      {/* Header row */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
        }}
      >
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 4,
            }}
          >
            {isActive && (
              <div
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: "var(--accent-green)",
                  boxShadow: "0 0 6px var(--accent-green)",
                  animation: "pulse-dot 1.5s ease-in-out infinite",
                  flexShrink: 0,
                }}
              />
            )}
            <h3
              style={{
                color: "var(--text-primary)",
                fontSize: 15,
                fontFamily: "var(--font-display)",
                fontWeight: 700,
              }}
            >
              {workflow.name}
            </h3>
          </div>
          <div
            style={{ color: "var(--text-primary)", fontSize: 10, opacity: 0.6 }}
          >
            Created {formatDate(workflow.createdAt)}
          </div>
        </div>
        <div
          style={{
            background: isActive ? "#14532d" : "var(--bg-base)",
            border: `1px solid ${isActive ? "var(--accent-green)" : "var(--border)"}`,
            color: isActive ? "var(--accent-green)" : "var(--text-secondary)",
            borderRadius: 20,
            padding: "3px 12px",
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: 1,
          }}
        >
          {isActive ? "▶ RUNNING" : "◼ IDLE"}
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: "flex", gap: 20 }}>
        {[
          {
            label: "NODES",
            val: workflow.nodes?.length || 0,
            color: "var(--accent-blue)",
          },
          {
            label: "EDGES",
            val: workflow.edges?.length || 0,
            color: "var(--accent-purple)",
          },
          {
            label: "EXECUTIONS",
            val: workflow.executions || 0,
            color: "var(--accent-yellow)",
          },
        ].map((s) => (
          <div key={s.label}>
            <div style={{ color: s.color, fontSize: 16, fontWeight: 700 }}>
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
        {workflow.lastRun && (
          <div style={{ marginLeft: "auto", textAlign: "right" }}>
            <div style={{ color: "var(--text-secondary)", fontSize: 10 }}>
              Last run
            </div>
            <div
              style={{
                color: "var(--text-primary)",
                fontSize: 10,
                opacity: 0.7,
              }}
            >
              {formatDate(workflow.lastRun)}
            </div>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div
        style={{
          display: "flex",
          gap: 8,
          borderTop: "1px solid var(--border)",
          paddingTop: 12,
        }}
      >
        <Link to={`/builder/${workflow.id}`} style={{ flex: 1 }}>
          <button
            style={{
              width: "100%",
              background: "var(--bg-elevated)",
              border: "1px solid var(--border)",
              color: "var(--text-secondary)",
              padding: "7px 0",
              borderRadius: "var(--radius-sm)",
              fontSize: 11,
              cursor: "pointer",
              fontFamily: "var(--font-mono)",
            }}
          >
            ✎ Open Editor
          </button>
        </Link>
        <button
          onClick={() => onToggle(workflow.id)}
          style={{
            flex: 1,
            background: isActive ? "#14532d" : "#0f2518",
            border: `1px solid ${isActive ? "var(--accent-green)" : "#166534"}`,
            color: "var(--accent-green)",
            padding: "7px 0",
            borderRadius: "var(--radius-sm)",
            fontSize: 11,
            cursor: "pointer",
            fontFamily: "var(--font-mono)",
            fontWeight: 600,
          }}
        >
          {isActive ? "◼ Deactivate" : "▶ Activate"}
        </button>
        <Link to={`/executions?workflow=${workflow.id}`}>
          <button
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--border)",
              color: "var(--text-muted)",
              padding: "7px 14px",
              borderRadius: "var(--radius-sm)",
              fontSize: 11,
              cursor: "pointer",
              fontFamily: "var(--font-mono)",
            }}
          >
            ◎ History
          </button>
        </Link>
        <button
          onClick={() => onDeleteClick(workflow)}
          style={{
            background: "var(--bg-elevated)",
            border: "1px solid var(--border)",
            color: "var(--accent-red)",
            padding: "7px 14px",
            borderRadius: "var(--radius-sm)",
            fontSize: 11,
            cursor: "pointer",
            fontFamily: "var(--font-mono)",
          }}
        >
          ✕
        </button>
      </div>
    </div>
  );
}

// Quick start workflow templates
const TEMPLATES = {
  dcaBot: {
    name: 'DCA Bot',
    desc: 'Timer → Spot Buy',
    icon: '⏱',
    color: '#f59e0b',
    nodes: [
      { id: 'n1', type: 'timer', x: 150, y: 200, config: { interval: '60', unit: 'seconds' } },
      { id: 'n2', type: 'spotBuy', x: 450, y: 200, config: { asset: 'SOL', qty: '0.01' } },
    ],
    edges: [
      { id: 'e1', from: 'n1', to: 'n2' },
    ],
  },
  stopLoss: {
    name: 'Stop Loss Guard',
    desc: 'Price Below → Spot Sell',
    icon: '🛑',
    color: '#f97316',
    nodes: [
      { id: 'n1', type: 'priceBelow', x: 150, y: 200, config: { asset: 'SOL', threshold: '150' } },
      { id: 'n2', type: 'spotSell', x: 450, y: 200, config: { asset: 'SOL', qty: '0.01' } },
    ],
    edges: [
      { id: 'e1', from: 'n1', to: 'n2' },
    ],
  },
  takeProfit: {
    name: 'Take Profit',
    desc: 'Price Above → Spot Sell',
    icon: '🎯',
    color: '#06b6d4',
    nodes: [
      { id: 'n1', type: 'priceAbove', x: 150, y: 200, config: { asset: 'SOL', threshold: '200' } },
      { id: 'n2', type: 'spotSell', x: 450, y: 200, config: { asset: 'SOL', qty: '0.01' } },
    ],
    edges: [
      { id: 'e1', from: 'n1', to: 'n2' },
    ],
  },
  leverageLong: {
    name: 'Leverage Long',
    desc: 'Price Below → Long',
    icon: '⬆',
    color: '#22c55e',
    nodes: [
      { id: 'n1', type: 'priceBelow', x: 150, y: 200, config: { asset: 'SOL', threshold: '150' } },
      { id: 'n2', type: 'longOrder', x: 450, y: 200, config: { asset: 'SOL', qty: '0.01', leverage: '10x' } },
    ],
    edges: [
      { id: 'e1', from: 'n1', to: 'n2' },
    ],
  },
  hedgeStrategy: {
    name: 'Hedge Strategy',
    desc: 'Price Below → Long + Short',
    icon: '◎',
    color: '#818cf8',
    nodes: [
      { id: 'n1', type: 'priceBelow', x: 150, y: 250, config: { asset: 'SOL', threshold: '150' } },
      { id: 'n2', type: 'longOrder', x: 450, y: 150, config: { asset: 'SOL', qty: '0.01', leverage: '5x' } },
      { id: 'n3', type: 'shortOrder', x: 450, y: 350, config: { asset: 'ETH', qty: '0.01', leverage: '2x' } },
    ],
    edges: [
      { id: 'e1', from: 'n1', to: 'n2' },
      { id: 'e2', from: 'n1', to: 'n3' },
    ],
  },
  alertBot: {
    name: 'Alert Bot',
    desc: 'Timer → Telegram',
    icon: '📨',
    color: '#38bdf8',
    nodes: [
      { id: 'n1', type: 'timer', x: 150, y: 200, config: { interval: '300', unit: 'seconds' } },
      { id: 'n2', type: 'telegram', x: 450, y: 200, config: { chatId: '@yourusername', msg: 'Market update alert!' } },
    ],
    edges: [
      { id: 'e1', from: 'n1', to: 'n2' },
    ],
  },
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { workflows, toggleWorkflow, deleteWorkflow, saveWorkflow } = useWorkflow()

  const activeCount = workflows.filter(w => w.isActive).length

  // Delete modal state
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    type: null, // 'active-warning' or 'confirm'
    workflow: null,
  })
  const [confirmNameInput, setConfirmNameInput] = useState('')

  // Handle delete button click
  const handleDeleteClick = (workflow) => {
    // Check if workflow is active
    if (workflow.isActive) {
      setDeleteModal({
        isOpen: true,
        type: 'active-warning',
        workflow,
      })
    } else {
      // Show confirmation modal
      setDeleteModal({
        isOpen: true,
        type: 'confirm',
        workflow,
      })
      setConfirmNameInput('')
    }
  }

  // Close modal
  const closeDeleteModal = () => {
    setDeleteModal({
      isOpen: false,
      type: null,
      workflow: null,
    })
    setConfirmNameInput('')
  }

  // Confirm deletion
  const confirmDelete = () => {
    if (confirmNameInput === deleteModal.workflow?.name) {
      deleteWorkflow(deleteModal.workflow.id)
      closeDeleteModal()
    }
  }

  // Handle quick start template click
  const handleTemplateClick = (templateKey) => {
    const template = TEMPLATES[templateKey]
    if (!template) return

    const workflowId = genId('wf')
    const newWorkflow = {
      id: workflowId,
      name: template.name,
      nodes: template.nodes.map(node => ({
        ...node,
        id: genId('node'),
        config: node.config || getDefaultConfig(node.type),
      })),
      edges: template.edges.map((edge, idx) => ({
        ...edge,
        id: genId('edge'),
      })),
      isActive: false,
      createdAt: new Date().toISOString(),
      executions: 0,
      lastRun: null,
    }

    // Update node IDs in edges
    const nodeIdMap = {}
    template.nodes.forEach((templateNode, idx) => {
      nodeIdMap[templateNode.id] = newWorkflow.nodes[idx].id
    })
    newWorkflow.edges = newWorkflow.edges.map(edge => ({
      ...edge,
      from: nodeIdMap[edge.from],
      to: nodeIdMap[edge.to],
    }))

    saveWorkflow(newWorkflow)
    navigate(`/builder/${workflowId}`)
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
      <Topbar />

      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "28px 32px",
          display: "flex",
          flexDirection: "column",
          gap: 28,
        }}
      >
        {/* Page title */}
        <div>
          <h1
            style={{
              color: "var(--text-primary)",
              fontFamily: "var(--font-display)",
              fontSize: 24,
              fontWeight: 800,
              marginBottom: 4,
            }}
          >
            Dashboard
          </h1>
          <p
            style={{ color: "var(--text-primary)", fontSize: 12, opacity: 0.7 }}
          >
            Manage your automated trading workflows
          </p>
        </div>

        {/* Stats row */}
        <div style={{ display: "flex", gap: 16 }}>
          <StatCard
            label="Total Workflows"
            value={workflows.length}
            color="var(--accent-blue)"
            icon="⬡"
          />
          <StatCard
            label="Active Now"
            value={activeCount}
            color="var(--accent-green)"
            icon="▶"
          />
        </div>

        {/* Workflows grid */}
        <div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 16,
            }}
          >
            <h2
              style={{
                color: "var(--text-secondary)",
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: 1,
              }}
            >
              YOUR WORKFLOWS ({workflows.length})
            </h2>
          </div>

          {workflows.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "60px 0",
                color: "var(--text-secondary)",
                fontSize: 13,
                border: "1px dashed var(--border)",
                borderRadius: "var(--radius-lg)",
              }}
            >
              <div style={{ fontSize: 36, marginBottom: 12, opacity: 0.3 }}>
                ⚡
              </div>
              No workflows yet.{" "}
              <Link to="/builder/new" style={{ color: "var(--accent-yellow)", marginRight: 15 }}>
                Create one 
              </Link>

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
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
                gap: 16,
              }}
            >
              {workflows.map((wf) => (
                <WorkflowCard
                  key={wf.id}
                  workflow={wf}
                  onToggle={toggleWorkflow}
                  onDeleteClick={handleDeleteClick}
                />
              ))}
            </div>
          )}
        </div>

        {/* Quick-start guide */}
        <div
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-md)",
            padding: "20px 24px",
          }}
        >
          <h3
            style={{
              color: "var(--text-secondary)",
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: 1,
              marginBottom: 16,
            }}
          >
            QUICK START — COMMON WORKFLOWS
          </h3>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
              gap: 10,
            }}
          >
            {[
              { key: 'dcaBot',         name: 'DCA Bot',          desc: 'Timer → Spot Buy',          icon: '⏱', color: '#f59e0b' },
              { key: 'stopLoss',       name: 'Stop Loss Guard',  desc: 'Price Below → Spot Sell',   icon: '🛑', color: '#f97316' },
              { key: 'takeProfit',     name: 'Take Profit',      desc: 'Price Above → Spot Sell',   icon: '🎯', color: '#06b6d4' },
              { key: 'leverageLong',   name: 'Leverage Long',    desc: 'Price Below → Long',        icon: '⬆', color: '#22c55e' },
              { key: 'hedgeStrategy',  name: 'Hedge Strategy',   desc: 'Price Below → Long + Short',icon: '◎', color: '#818cf8' },
              { key: 'alertBot',       name: 'Alert Bot',        desc: 'Timer → Telegram',          icon: '📨', color: '#38bdf8' },
            ].map(template => (
              <div
                key={template.key}
                onClick={() => handleTemplateClick(template.key)}
                style={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '10px 14px',
                  cursor: 'pointer',
                  transition: 'border-color 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = template.color}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
              >
                <div style={{ fontSize: 16, marginBottom: 4 }}>{template.icon}</div>
                <div style={{ color: 'var(--text-primary)', fontSize: 11, fontWeight: 600 }}>{template.name}</div>
                <div style={{ color: 'var(--text-faint)', fontSize: 10, marginTop: 2 }}>{template.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Delete Modals */}
      {deleteModal.isOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            padding: 32,
            maxWidth: 480,
            width: '90%',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
          }}>
            {deleteModal.type === 'active-warning' ? (
              // Active workflow warning
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                  <div style={{
                    width: 48,
                    height: 48,
                    borderRadius: '50%',
                    background: '#f97316',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 24,
                  }}>
                    ⚠️
                  </div>
                  <h2 style={{ color: 'var(--text-primary)', fontSize: 18, fontWeight: 700 }}>
                    Cannot Delete Active Workflow
                  </h2>
                </div>
                
                <p style={{ color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.6, marginBottom: 20 }}>
                  The workflow <strong style={{ color: 'var(--accent-yellow)' }}>"{deleteModal.workflow?.name}"</strong> is currently running.
                  Please deactivate it first before attempting to delete.
                </p>

                <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                  <button
                    onClick={closeDeleteModal}
                    style={{
                      background: 'linear-gradient(135deg, var(--accent-blue), #3b82f6)',
                      border: 'none',
                      color: '#fff',
                      padding: '10px 24px',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    OK, Got It
                  </button>
                </div>
              </>
            ) : (
              // Confirmation modal
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                  <h2 style={{ color: 'var(--text-primary)', fontSize: 16, fontWeight: 700 }}>
                    Delete Workflow: {deleteModal.workflow?.name}
                  </h2>
                  <button
                    onClick={closeDeleteModal}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-muted)',
                      fontSize: 20,
                      cursor: 'pointer',
                      padding: 0,
                      width: 28,
                      height: 28,
                    }}
                  >
                    ✕
                  </button>
                </div>

                <div style={{
                  background: '#ef444415',
                  border: '1px solid #ef4444',
                  borderRadius: 'var(--radius-md)',
                  padding: '12px 16px',
                  marginBottom: 20,
                }}>
                  <p style={{ color: '#ef4444', fontSize: 12, lineHeight: 1.6, margin: 0 }}>
                    By deleting this workflow you will also delete all topics attached to the workflow and all attached topic content, images and polls.
                  </p>
                </div>

                <div style={{ marginBottom: 20 }}>
                  <label style={{
                    display: 'block',
                    color: 'var(--text-secondary)',
                    fontSize: 12,
                    fontWeight: 600,
                    marginBottom: 8,
                  }}>
                    Type the Name of the Workflow to confirm delete:
                  </label>
                  <input
                    type="text"
                    value={confirmNameInput}
                    onChange={(e) => setConfirmNameInput(e.target.value)}
                    placeholder={deleteModal.workflow?.name}
                    autoFocus
                    style={{
                      width: '100%',
                      background: 'var(--bg-base)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-md)',
                      padding: '12px 16px',
                      fontSize: 13,
                      color: 'var(--text-primary)',
                      outline: 'none',
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#ef4444'}
                    onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
                  />
                </div>

                <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                  <button
                    onClick={closeDeleteModal}
                    style={{
                      background: 'transparent',
                      border: '1px solid var(--border)',
                      color: 'var(--text-muted)',
                      padding: '10px 24px',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmDelete}
                    disabled={confirmNameInput !== deleteModal.workflow?.name}
                    style={{
                      background: confirmNameInput === deleteModal.workflow?.name 
                        ? '#ef4444' 
                        : 'var(--bg-elevated)',
                      border: 'none',
                      color: confirmNameInput === deleteModal.workflow?.name 
                        ? '#fff' 
                        : 'var(--text-faint)',
                      padding: '10px 24px',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: confirmNameInput === deleteModal.workflow?.name 
                        ? 'pointer' 
                        : 'not-allowed',
                      opacity: confirmNameInput === deleteModal.workflow?.name ? 1 : 0.5,
                    }}
                  >
                    DELETE
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
