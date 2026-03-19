import { useState, useCallback, useRef, useEffect } from 'react'
import {
  ReactFlow,
  Background,
  MarkerType,
  useNodesState,
  useEdgesState,
  useReactFlow,
  addEdge,
  ConnectionMode,
  type Node,
  type Edge,
  type OnConnect,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import DeleteModal from '../../ui/DeleteModal'
import ContextMenu from './ContextMenu'
import EdgeConditionModal from './EdgeConditionModal'
import { nodeTypes } from './nodes'
import type { TaskDef, ToolDef, EdgeCondition } from './types'
import { computeAvailableVariables, type ToolVariable } from '../../../lib/variables'

/* ───── Constants ───── */

const EDGE_MARKER = { type: MarkerType.ArrowClosed, color: 'var(--border)', width: 16, height: 16 }

const ALLOWED_TARGETS: Record<string, string[]> = {
  start: ['agent'],
  agent: ['task', 'tool'],
  task: ['task', 'tool'],
  tool: [],
}

const LABEL_STYLE = { fill: 'var(--text-muted)', fontSize: 9, fontWeight: 500 }
const LABEL_BG_STYLE = { fill: 'var(--bg)', stroke: 'var(--border-muted)', strokeWidth: 1, rx: 4, ry: 4 }
const LABEL_BG_PADDING: [number, number] = [6, 4]

/* ───── Edge helpers ───── */

function buildEdgeStyle(isToolEdge: boolean) {
  return isToolEdge
    ? { stroke: 'var(--edge-stroke)', strokeWidth: 1.5, strokeDasharray: '6 4' }
    : { stroke: 'var(--edge-stroke)', strokeWidth: 1.5 }
}

function restoreEdge(saved: any, nodeTypeMap: Map<string, string>): Edge {
  const isToolEdge = nodeTypeMap.get(saved.source) === 'tool' || nodeTypeMap.get(saved.target) === 'tool'
  return {
    id: saved.id,
    source: saved.source,
    target: saved.target,
    sourceHandle: saved.sourceHandle,
    targetHandle: saved.targetHandle,
    type: 'smoothstep',
    style: buildEdgeStyle(isToolEdge),
    ...(isToolEdge ? {} : { markerEnd: EDGE_MARKER }),
    data: saved.data,
    label: saved.label,
    ...(saved.label ? { labelStyle: LABEL_STYLE, labelBgStyle: LABEL_BG_STYLE, labelBgPadding: LABEL_BG_PADDING } : {}),
  }
}

/* ───── Props ───── */

interface FlowCanvasProps {
  agentName: string
  tasks: TaskDef[]
  tools: ToolDef[]
  flowData?: any
  onFlowChange?: (data: any) => void
}

/* ───── Component ───── */

export default function FlowCanvas({ agentName, tasks, tools, flowData, onFlowChange }: FlowCanvasProps) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null)
  const { screenToFlowPosition } = useReactFlow()
  const [menu, setMenu] = useState<{ x: number; y: number; flowX: number; flowY: number } | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'node' | 'edge'; id: string; label: string } | null>(null)
  const [labelEdit, setLabelEdit] = useState<{ edgeId: string; initial: EdgeCondition | null; variables: ToolVariable[] } | null>(null)

  const skipInitialSave = useRef(true)
  const setNodesRef = useRef<React.Dispatch<React.SetStateAction<Node[]>>>(null!)

  /* ── Stable node label updater ── */
  const updateNodeLabel = useCallback(
    (nodeId: string, newLabel: string) => {
      setNodesRef.current((nds) => nds.map((n) => n.id === nodeId ? { ...n, data: { ...n.data, label: newLabel } } : n))
    },
    [],
  )

  /* ── Reconstitute node data with callbacks ── */
  const reconstituteNodeData = useCallback(
    (saved: { id: string; type?: string; data?: any }) => {
      switch (saved.type || 'start') {
        case 'start': return {}
        case 'agent': return { label: agentName }
        case 'task': return {
          label: saved.data?.label || 'Choisir une task...',
          items: tasks,
          onSelect: (name: string) => updateNodeLabel(saved.id, name),
        }
        case 'tool': return {
          label: saved.data?.label || 'Choisir un tool...',
          items: tools,
          onSelect: (name: string) => updateNodeLabel(saved.id, name),
        }
        default: return saved.data || {}
      }
    },
    [agentName, tasks, tools, updateNodeLabel],
  )

  /* ── Initial state ── */
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const buildInitialState = useCallback((): { nodes: Node[]; edges: Edge[] } => {
    if (flowData?.nodes?.length > 0) {
      const nodeTypeMap = new Map<string, string>()
      flowData.nodes.forEach((saved: any) => nodeTypeMap.set(saved.id, saved.type || 'start'))

      return {
        nodes: flowData.nodes.map((saved: any) => ({
          id: saved.id,
          type: saved.type || 'start',
          position: saved.position,
          data: reconstituteNodeData(saved),
        })),
        edges: (flowData.edges || []).map((saved: any) => restoreEdge(saved, nodeTypeMap)),
      }
    }

    return {
      nodes: [
        { id: 'start', type: 'start', position: { x: 80, y: 120 }, data: {} },
        { id: 'agent-main', type: 'agent', position: { x: 320, y: 105 }, data: { label: agentName } },
      ],
      edges: [
        { id: 'e-start-agent', source: 'start', target: 'agent-main', style: buildEdgeStyle(false), type: 'smoothstep', markerEnd: EDGE_MARKER },
      ],
    }
  }, [])

  const [initialState] = useState(buildInitialState)
  const [nodes, setNodes, onNodesChange] = useNodesState(initialState.nodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialState.edges)
  setNodesRef.current = setNodes

  /* ── Sync agent name ── */
  useEffect(() => {
    setNodes((nds) => nds.map((n) => n.type === 'agent' ? { ...n, data: { ...n.data, label: agentName } } : n))
  }, [agentName, setNodes])

  /* ── Sync task/tool items ── */
  useEffect(() => {
    setNodes((nds) => nds.map((n) => {
      if (n.type === 'task') return { ...n, data: { ...n.data, items: tasks } }
      if (n.type === 'tool') return { ...n, data: { ...n.data, items: tools } }
      return n
    }))
  }, [tasks, tools, setNodes])

  /* ── Debounced persistence ── */
  useEffect(() => {
    if (skipInitialSave.current) { skipInitialSave.current = false; return }
    const timer = setTimeout(() => {
      const serializableNodes = nodes.map((n) => ({
        id: n.id, type: n.type, position: n.position,
        data: { label: (n.data as any).label },
      }))
      const serializableEdges = edges.map((e) => ({
        id: e.id, source: e.source, target: e.target,
        sourceHandle: e.sourceHandle, targetHandle: e.targetHandle,
        data: e.data, label: e.label,
      }))
      onFlowChange?.({ nodes: serializableNodes, edges: serializableEdges })
    }, 300)
    return () => clearTimeout(timer)
  }, [nodes, edges, onFlowChange])

  /* ── Connection rules ── */
  const onConnect: OnConnect = useCallback(
    (params) => {
      const src = nodes.find((n) => n.id === params.source)
      const tgt = nodes.find((n) => n.id === params.target)
      if (!src || !tgt || src.id === tgt.id) return
      if (!(ALLOWED_TARGETS[src.type!] || []).includes(tgt.type!)) return

      const isToolTarget = tgt.type === 'tool'
      setEdges((eds) => addEdge({
        ...params,
        style: buildEdgeStyle(isToolTarget),
        type: 'smoothstep' as const,
        ...(isToolTarget ? {} : { markerEnd: EDGE_MARKER }),
      }, eds))
    },
    [setEdges, nodes],
  )

  /* ── Pane click ── */
  const onPaneClick = useCallback(() => { setMenu(null); setDeleteConfirm(null) }, [])

  /* ── Node context menu (delete) ── */
  const onNodeContextMenu = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      _event.preventDefault()
      if (node.id === 'start' || node.id === 'agent-main') return
      setDeleteConfirm({ type: 'node', id: node.id, label: (node.data as any).label || node.id })
    },
    [],
  )

  /* ── Edge context menu (delete) ── */
  const onEdgeContextMenu = useCallback(
    (event: React.MouseEvent, edge: Edge) => {
      event.preventDefault()
      if (edge.id === 'e-start-agent') return
      const srcLabel = (nodes.find((n) => n.id === edge.source)?.data as any)?.label || edge.source
      const tgtLabel = (nodes.find((n) => n.id === edge.target)?.data as any)?.label || edge.target
      setDeleteConfirm({ type: 'edge', id: edge.id, label: `${srcLabel} → ${tgtLabel}` })
    },
    [nodes],
  )

  /* ── Edge click (condition editor) ── */
  const onEdgeClick = useCallback(
    (_event: React.MouseEvent, edge: Edge) => {
      const src = nodes.find((n) => n.id === edge.source)
      const tgt = nodes.find((n) => n.id === edge.target)
      if (!src || !tgt) return
      if (src.type !== 'agent' && src.type !== 'task') return
      if (tgt.type === 'tool') return

      const existing = (edge.data as EdgeCondition | undefined) ?? null
      const flowToolNames = new Set(
        nodes.filter((n) => n.type === 'tool').map((n) => (n.data as any)?.label).filter(Boolean),
      )
      const flowTools = tools.filter((t) => flowToolNames.has(t.name))
      setLabelEdit({ edgeId: edge.id, initial: existing, variables: computeAvailableVariables(flowTools) })
    },
    [nodes, tools],
  )

  /* ── Delete confirm ── */
  const handleDeleteConfirm = useCallback(() => {
    if (!deleteConfirm) return
    if (deleteConfirm.type === 'node') {
      setNodes((nds) => nds.filter((n) => n.id !== deleteConfirm.id))
      setEdges((eds) => eds.filter((e) => e.source !== deleteConfirm.id && e.target !== deleteConfirm.id))
    } else {
      setEdges((eds) => eds.filter((e) => e.id !== deleteConfirm.id))
    }
    setDeleteConfirm(null)
  }, [deleteConfirm, setNodes, setEdges])

  /* ── Edge condition save/remove ── */
  const handleLabelSave = useCallback(
    (data: EdgeCondition) => {
      setEdges((eds) => eds.map((e) =>
        e.id === labelEdit?.edgeId
          ? { ...e, data, label: data.label, labelStyle: LABEL_STYLE, labelBgStyle: LABEL_BG_STYLE, labelBgPadding: LABEL_BG_PADDING }
          : e,
      ))
      setLabelEdit(null)
    },
    [labelEdit, setEdges],
  )

  const handleLabelRemove = useCallback(() => {
    setEdges((eds) => eds.map((e) =>
      e.id === labelEdit?.edgeId
        ? { ...e, data: undefined, label: undefined, labelStyle: undefined, labelBgStyle: undefined, labelBgPadding: undefined }
        : e,
    ))
    setLabelEdit(null)
  }, [labelEdit, setEdges])

  /* ── Pane context menu ── */
  const onPaneContextMenu = useCallback(
    (event: MouseEvent | React.MouseEvent) => {
      event.preventDefault()
      const bounds = reactFlowWrapper.current?.getBoundingClientRect()
      if (!bounds) return
      const flowPos = screenToFlowPosition({ x: event.clientX, y: event.clientY })
      setMenu({ x: event.clientX - bounds.left, y: event.clientY - bounds.top, flowX: flowPos.x, flowY: flowPos.y })
    },
    [screenToFlowPosition],
  )

  /* ── Add node ── */
  const addNode = useCallback(
    (type: 'task' | 'tool') => {
      if (!menu) return
      const id = crypto.randomUUID()
      const label = type === 'task' ? 'Choisir une task...' : 'Choisir un tool...'
      const items = type === 'task' ? tasks : tools

      setNodes((nds) => [...nds, {
        id,
        type,
        position: { x: menu.flowX, y: menu.flowY },
        data: { label, items, onSelect: (name: string) => updateNodeLabel(id, name) },
      }])
      setMenu(null)
    },
    [menu, setNodes, tasks, tools, updateNodeLabel],
  )

  /* ── Render ── */
  return (
    <div ref={reactFlowWrapper} className="w-full h-full relative" style={{ background: 'var(--bg-dark)' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onPaneClick={onPaneClick}
        onEdgeClick={onEdgeClick}
        onNodeContextMenu={onNodeContextMenu}
        onEdgeContextMenu={onEdgeContextMenu}
        connectionMode={ConnectionMode.Loose}
        onPaneContextMenu={onPaneContextMenu}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.4 }}
        proOptions={{ hideAttribution: true }}
        defaultEdgeOptions={{ type: 'smoothstep', style: buildEdgeStyle(false) }}
      >
        <Background color="var(--border-muted)" gap={20} size={1} />
      </ReactFlow>

      {menu && <ContextMenu x={menu.x} y={menu.y} onAdd={addNode} onClose={() => setMenu(null)} />}

      {deleteConfirm && (
        <DeleteModal
          title="Supprimer"
          name={deleteConfirm.label}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteConfirm(null)}
        />
      )}

      {labelEdit && (
        <EdgeConditionModal
          initial={labelEdit.initial}
          variables={labelEdit.variables}
          onSave={handleLabelSave}
          onRemove={handleLabelRemove}
          onCancel={() => setLabelEdit(null)}
        />
      )}
    </div>
  )
}
