import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
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
import { nodeTypes } from './nodes'
import type { AgentDef, ToolItem, PipelineAgentNodeData, PipelineToolNodeData } from './types'

/* ───── Constants ───── */

const EDGE_MARKER = { type: MarkerType.ArrowClosed, color: 'var(--border)', width: 16, height: 16 }

function buildEdgeStyle(isToolEdge: boolean) {
  return isToolEdge
    ? { stroke: 'var(--edge-stroke)', strokeWidth: 1.5, strokeDasharray: '6 4' }
    : { stroke: 'var(--edge-stroke)', strokeWidth: 1.5 }
}

/* ───── Props ───── */

interface FlowCanvasProps {
  agents: any[]
  tools: any[]
  flowData?: any
  onFlowChange?: (data: any) => void
}

/* ───── Component ───── */

export default function FlowCanvas({ agents, tools, flowData, onFlowChange }: FlowCanvasProps) {
  /* Build agent definitions with handoffs + versions */
  const availableAgentDefs: AgentDef[] = useMemo(
    () => agents.map((a: any) => {
      const handoffTools = (a.tools || []).filter((t: any) => t.type === 'handoff')
      const versions = (a.versions || []).map((v: any) => ({ version: v.version, label: v.label || '' }))
      return {
        id: a.id,
        name: a.name,
        handoffs: handoffTools.map((t: any) => ({ toolName: t.name, label: t.name })),
        versions,
        currentVersion: a.current_version ?? 1,
      }
    }),
    [agents],
  )

  const pipelineTools: ToolItem[] = useMemo(
    () => (tools || []).map((t: any) => ({ id: t.id, name: t.name })),
    [tools],
  )

  const reactFlowWrapper = useRef<HTMLDivElement>(null)
  const { screenToFlowPosition } = useReactFlow()
  const [menu, setMenu] = useState<{ x: number; y: number; flowX: number; flowY: number } | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'node' | 'edge'; id: string; label: string } | null>(null)

  const agentSelectRef = useRef<(nodeId: string, agent: AgentDef) => void>(() => {})
  const versionSelectRef = useRef<(nodeId: string, version: number, label: string) => void>(() => {})
  const toolSelectRef = useRef<(nodeId: string, name: string) => void>(() => {})
  const isInitialLoad = useRef(true)

  /* ── Build initial state ── */
  const buildInitialState = (): { nodes: Node[]; edges: Edge[]; counter: number } => {
    const hasFlowData = flowData && Array.isArray(flowData.nodes) && flowData.nodes.length > 0

    if (hasFlowData) {
      let maxCounter = 2
      const restoredNodes: Node[] = flowData.nodes.map((saved: any) => {
        const match = saved.id.match(/^(?:agent|tool)-(\d+)$/)
        if (match) {
          const num = parseInt(match[1], 10)
          if (num >= maxCounter) maxCounter = num + 1
        }

        if (saved.type === 'start') {
          return { id: saved.id, type: 'start', position: saved.position, data: {} }
        }

        if (saved.type === 'pipeline-tool') {
          return {
            id: saved.id,
            type: 'pipeline-tool',
            position: saved.position,
            data: {
              label: saved.data?.label || 'Choisir un tool...',
              items: pipelineTools,
              onSelect: (name: string) => toolSelectRef.current(saved.id, name),
            } as PipelineToolNodeData,
          }
        }

        const agentDef = availableAgentDefs.find((a) => a.id === saved.data?.agentId)
        const savedVersion = saved.data?.agentVersion ?? agentDef?.currentVersion ?? null
        const savedVersionLabel = saved.data?.versionLabel || (savedVersion != null ? `v${savedVersion}` : '')
        return {
          id: saved.id,
          type: saved.type,
          position: saved.position,
          data: {
            label: agentDef?.name || saved.data?.label || 'Choisir un agent...',
            agentId: saved.data?.agentId || null,
            agentVersion: savedVersion,
            versionLabel: savedVersionLabel,
            handoffs: agentDef?.handoffs || [],
            agents: availableAgentDefs,
            versions: agentDef?.versions || [],
            onSelect: (agent: AgentDef) => agentSelectRef.current(saved.id, agent),
            onVersionSelect: (version: number, label: string) => versionSelectRef.current(saved.id, version, label),
          } as PipelineAgentNodeData,
        }
      })

      const nodeTypeMap = new Map<string, string>()
      flowData.nodes.forEach((saved: any) => nodeTypeMap.set(saved.id, saved.type || 'start'))

      const restoredEdges: Edge[] = (flowData.edges || []).map((saved: any) => {
        const isToolEdge = nodeTypeMap.get(saved.source) === 'pipeline-tool' || nodeTypeMap.get(saved.target) === 'pipeline-tool'
        return {
          id: saved.id,
          source: saved.source,
          target: saved.target,
          sourceHandle: saved.sourceHandle,
          targetHandle: saved.targetHandle,
          type: 'smoothstep',
          style: buildEdgeStyle(isToolEdge),
          ...(isToolEdge ? {} : { markerEnd: EDGE_MARKER }),
        }
      })

      return { nodes: restoredNodes, edges: restoredEdges, counter: maxCounter }
    }

    return {
      nodes: [
        { id: 'start', type: 'start', position: { x: 80, y: 120 }, data: {} },
        {
          id: 'agent-1',
          type: 'pipeline-agent',
          position: { x: 280, y: 90 },
          data: {
            label: 'Choisir un agent...',
            agentId: null,
            agentVersion: null,
            versionLabel: '',
            handoffs: [],
            agents: availableAgentDefs,
            versions: [],
            onSelect: (agent: AgentDef) => agentSelectRef.current('agent-1', agent),
            onVersionSelect: (version: number, label: string) => versionSelectRef.current('agent-1', version, label),
          } as PipelineAgentNodeData,
        },
      ],
      edges: [
        {
          id: 'e-start-agent1',
          source: 'start',
          sourceHandle: 'start-right',
          target: 'agent-1',
          targetHandle: 'input-left',
          style: buildEdgeStyle(false),
          type: 'smoothstep',
          markerEnd: EDGE_MARKER,
        },
      ],
      counter: 2,
    }
  }

  const [initialState] = useState(buildInitialState)
  const [counter, setCounter] = useState(initialState.counter)
  const [nodes, setNodes, onNodesChange] = useNodesState(initialState.nodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialState.edges)

  /* ── Ref callbacks ── */
  agentSelectRef.current = (nodeId: string, agent: AgentDef) => {
    setNodes((nds) => nds.map((n) =>
      n.id === nodeId
        ? { ...n, data: { ...n.data, label: agent.name, agentId: agent.id, agentVersion: agent.currentVersion, versionLabel: `v${agent.currentVersion}`, handoffs: agent.handoffs, versions: agent.versions } }
        : n,
    ))
    setEdges((eds) => eds.filter((e) => {
      if (e.source !== nodeId) return true
      if (!e.sourceHandle || e.sourceHandle === 'default') return true
      return agent.handoffs.some((h) => h.toolName === e.sourceHandle)
    }))
  }

  versionSelectRef.current = (nodeId: string, version: number, label: string) => {
    setNodes((nds) => nds.map((n) =>
      n.id === nodeId
        ? { ...n, data: { ...n.data, agentVersion: version, versionLabel: label } }
        : n,
    ))
  }

  toolSelectRef.current = (nodeId: string, name: string) => {
    setNodes((nds) => nds.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, label: name } } : n)))
  }

  /* ── Sync tool items ── */
  useEffect(() => {
    setNodes((nds) => nds.map((n) => (n.type === 'pipeline-tool' ? { ...n, data: { ...n.data, items: pipelineTools } } : n)))
  }, [pipelineTools, setNodes])

  /* ── Debounced persistence ── */
  useEffect(() => {
    if (isInitialLoad.current) { isInitialLoad.current = false; return }
    const timer = setTimeout(() => {
      const serializableNodes = nodes.map((n) => ({
        id: n.id,
        type: n.type,
        position: n.position,
        data: {
          label: (n.data as any).label,
          ...(n.type === 'pipeline-agent' ? {
            agentId: (n.data as any).agentId,
            agentVersion: (n.data as any).agentVersion ?? null,
            versionLabel: (n.data as any).versionLabel ?? '',
          } : {}),
        },
      }))
      const serializableEdges = edges.map((e) => ({
        id: e.id, source: e.source, target: e.target,
        sourceHandle: e.sourceHandle, targetHandle: e.targetHandle,
      }))
      onFlowChange?.({ nodes: serializableNodes, edges: serializableEdges })
    }, 300)
    return () => clearTimeout(timer)
  }, [nodes, edges, onFlowChange])

  /* ── Stable callbacks for adding nodes ── */
  const updateNodeAgent = useCallback(
    (nodeId: string, agent: AgentDef) => {
      setNodes((nds) => nds.map((n) =>
        n.id === nodeId
          ? { ...n, data: { ...n.data, label: agent.name, agentId: agent.id, agentVersion: agent.currentVersion, versionLabel: `v${agent.currentVersion}`, handoffs: agent.handoffs, versions: agent.versions } }
          : n,
      ))
      setEdges((eds) => eds.filter((e) => {
        if (e.source !== nodeId) return true
        if (!e.sourceHandle || e.sourceHandle === 'default') return true
        return agent.handoffs.some((h) => h.toolName === e.sourceHandle)
      }))
    },
    [setNodes, setEdges],
  )

  const updateNodeVersion = useCallback(
    (nodeId: string, version: number, label: string) => {
      setNodes((nds) => nds.map((n) =>
        n.id === nodeId
          ? { ...n, data: { ...n.data, agentVersion: version, versionLabel: label } }
          : n,
      ))
    },
    [setNodes],
  )

  const updateToolLabel = useCallback(
    (nodeId: string, name: string) => {
      setNodes((nds) => nds.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, label: name } } : n)))
    },
    [setNodes],
  )

  /* ── Connect ── */
  const onConnect: OnConnect = useCallback(
    (params) => {
      const duplicate = edges.find((e) => e.source === params.source && e.sourceHandle === params.sourceHandle)
      if (duplicate) return

      const sourceNode = nodes.find((n) => n.id === params.source)
      const targetNode = nodes.find((n) => n.id === params.target)
      const isToolEdge = sourceNode?.type === 'pipeline-tool' || targetNode?.type === 'pipeline-tool'

      setEdges((eds) => addEdge({
        ...params,
        style: buildEdgeStyle(isToolEdge),
        type: 'smoothstep' as const,
        ...(isToolEdge ? {} : { markerEnd: EDGE_MARKER }),
      }, eds))
    },
    [setEdges, edges, nodes],
  )

  /* ── Event handlers ── */
  const onPaneClick = useCallback(() => { setMenu(null); setDeleteConfirm(null) }, [])

  const onNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: Node) => {
      event.preventDefault()
      if (node.id === 'start') return
      setDeleteConfirm({ type: 'node', id: node.id, label: (node.data as any).label || node.id })
    },
    [],
  )

  const onEdgeContextMenu = useCallback(
    (event: React.MouseEvent, edge: Edge) => {
      event.preventDefault()
      const srcLabel = (nodes.find((n) => n.id === edge.source)?.data as any)?.label || edge.source
      const tgtLabel = (nodes.find((n) => n.id === edge.target)?.data as any)?.label || edge.target
      const handleLabel = edge.sourceHandle && edge.sourceHandle !== 'default' ? ` (${edge.sourceHandle})` : ''
      setDeleteConfirm({ type: 'edge', id: edge.id, label: `${srcLabel}${handleLabel} → ${tgtLabel}` })
    },
    [nodes],
  )

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

  /* ── Add nodes ── */
  const addAgentNode = useCallback(() => {
    if (!menu) return
    const id = `agent-${counter}`
    setCounter((c) => c + 1)
    setNodes((nds) => [...nds, {
      id,
      type: 'pipeline-agent',
      position: { x: menu.flowX, y: menu.flowY },
      data: {
        label: 'Choisir un agent...',
        agentId: null,
        agentVersion: null,
        versionLabel: '',
        handoffs: [],
        agents: availableAgentDefs,
        versions: [],
        onSelect: (agent: AgentDef) => updateNodeAgent(id, agent),
        onVersionSelect: (version: number, label: string) => updateNodeVersion(id, version, label),
      } as PipelineAgentNodeData,
    }])
    setMenu(null)
  }, [menu, counter, setNodes, updateNodeAgent, updateNodeVersion, availableAgentDefs])

  const addToolNode = useCallback(() => {
    if (!menu) return
    const id = `tool-${counter}`
    setCounter((c) => c + 1)
    setNodes((nds) => [...nds, {
      id,
      type: 'pipeline-tool',
      position: { x: menu.flowX, y: menu.flowY },
      data: {
        label: 'Choisir un tool...',
        items: pipelineTools,
        onSelect: (name: string) => updateToolLabel(id, name),
      } as PipelineToolNodeData,
    }])
    setMenu(null)
  }, [menu, counter, setNodes, updateToolLabel, pipelineTools])

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
        onNodeContextMenu={onNodeContextMenu}
        onEdgeContextMenu={onEdgeContextMenu}
        connectionMode={ConnectionMode.Loose}
        onPaneContextMenu={onPaneContextMenu}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.4, maxZoom: 1 }}
        proOptions={{ hideAttribution: true }}
        defaultEdgeOptions={{ type: 'smoothstep', style: buildEdgeStyle(false) }}
      >
        <Background color="var(--border-muted)" gap={20} size={1} />
      </ReactFlow>

      {menu && (
        <ContextMenu
          x={menu.x}
          y={menu.y}
          onAddAgent={addAgentNode}
          onAddTool={addToolNode}
          onClose={() => setMenu(null)}
        />
      )}

      {deleteConfirm && (
        <DeleteModal
          title="Supprimer"
          name={deleteConfirm.label}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteConfirm(null)}
        />
      )}
    </div>
  )
}
