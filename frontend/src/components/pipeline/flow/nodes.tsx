import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Handle, Position, useUpdateNodeInternals, type NodeTypes } from '@xyflow/react'
import { FiFlag, FiArrowRight, FiChevronDown } from 'react-icons/fi'
import { RiRobot3Line } from 'react-icons/ri'
import { LuWrench } from 'react-icons/lu'
import type { AgentDef, AgentVersionDef, PipelineAgentNodeData, PipelineToolNodeData } from './types'

function getPortalRoot() {
  return document.getElementById('portal-root') || document.body
}

const handleStyle = (color: string) => ({
  background: color,
  width: 7,
  height: 7,
  border: '1.5px solid var(--bg-dark)',
})

/* ───── Start Node ───── */

function PipelineStartNode() {
  const style = handleStyle('var(--success)')
  return (
    <div
      className="flex items-center gap-2 px-3 py-2 rounded-lg"
      style={{ background: 'var(--bg)', border: '1.5px solid var(--border-muted)' }}
    >
      <FiFlag size={11} style={{ color: 'var(--success)' }} />
      <span className="text-[10px] font-semibold" style={{ color: 'var(--text-muted)' }}>Start</span>
      <Handle type="source" position={Position.Top} id="start-top" style={style} />
      <Handle type="source" position={Position.Right} id="start-right" style={style} />
      <Handle type="source" position={Position.Bottom} id="start-bottom" style={style} />
      <Handle type="source" position={Position.Left} id="start-left" style={style} />
    </div>
  )
}

/* ───── Pipeline Agent Node ───── */

function PipelineAgentNode({ id, data, selected }: { id: string; data: PipelineAgentNodeData; selected?: boolean }) {
  const [open, setOpen] = useState(false)
  const [versionOpen, setVersionOpen] = useState(false)
  const updateNodeInternals = useUpdateNodeInternals()
  const handoffs = data.handoffs || []
  const agents = data.agents || []
  const versions = data.versions || []
  const isChosen = !!data.agentId

  const handoffKeys = handoffs.map((h) => h.toolName).join(',')
  useEffect(() => { updateNodeInternals(id) }, [handoffKeys, id, updateNodeInternals])

  return (
    <div
      className="rounded-md"
      style={{ background: 'var(--bg)', border: `1.5px solid ${selected ? 'var(--c-agent)' : 'var(--border-muted)'}`, width: 190 }}
    >
      <Handle type="target" position={Position.Top} id="input-top" style={handleStyle('var(--c-agent)')} />
      <Handle type="target" position={Position.Left} id="input-left" style={handleStyle('var(--c-agent)')} />
      <Handle type="target" position={Position.Bottom} id="input-bottom" style={handleStyle('var(--c-agent)')} />

      {/* Header */}
      <div className="flex items-center gap-1 px-2.5 rounded-t-sm" style={{ background: 'var(--bg-light)', padding: '5px 10px' }}>
        <RiRobot3Line size={8} style={{ color: 'var(--c-agent)' }} />
        <span className="text-[8px] font-semibold uppercase tracking-wider" style={{ color: 'var(--highlight)' }}>Agent</span>
      </div>

      {/* Agent + Version selectors */}
      <div className="px-1.5 py-1.5 flex gap-1 relative" onClick={(e) => e.stopPropagation()}>
        {/* Agent selector */}
        <div className="flex-1 min-w-0 relative">
          <button
            onClick={() => { setOpen(!open); setVersionOpen(false) }}
            className="w-full flex items-center justify-between px-2 py-1.5 rounded cursor-pointer"
            style={{
              background: 'var(--bg-light)',
              border: `1px solid ${isChosen ? 'var(--border-muted)' : 'var(--border)'}`,
              color: isChosen ? 'var(--text)' : 'var(--highlight)',
            }}
          >
            <span className="text-[10px] font-semibold truncate">{data.label}</span>
            <FiChevronDown size={9} style={{ color: 'var(--highlight)', flexShrink: 0 }} />
          </button>
          {open && agents.length > 0 && (
            <div
              className="absolute left-0 right-0 mt-1 rounded-md overflow-hidden z-50 py-0.5"
              style={{ background: 'var(--bg)', border: '1px solid var(--border-muted)', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}
            >
              {agents.map((agent) => (
                <button
                  key={agent.id}
                  onClick={() => { data.onSelect?.(agent); setOpen(false) }}
                  className="w-full text-left px-2.5 py-2 text-[10px] font-medium cursor-pointer transition-colors duration-100 flex items-center justify-between"
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-light)'; e.currentTarget.style.color = 'var(--text)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)' }}
                >
                  <span>{agent.name}</span>
                  {agent.handoffs.length > 0 && (
                    <span className="text-[8px]" style={{ color: 'var(--highlight)' }}>{agent.handoffs.length}h</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Version selector */}
        {isChosen && (
          <div className="relative" style={{ width: 52 }}>
            <button
              onClick={() => { setVersionOpen(!versionOpen); setOpen(false) }}
              className="w-full flex items-center justify-between px-1.5 py-1.5 rounded cursor-pointer"
              style={{
                background: 'var(--bg-light)',
                border: '1px solid var(--border-muted)',
                color: 'var(--text-muted)',
              }}
            >
              <span className="text-[9px] font-semibold truncate">{data.versionLabel || `v${data.agentVersion ?? '?'}`}</span>
              <FiChevronDown size={8} style={{ color: 'var(--highlight)', flexShrink: 0 }} />
            </button>
            {versionOpen && versions.length > 0 && (
              <div
                className="absolute left-0 mt-1 rounded-md overflow-hidden z-50 py-0.5"
                style={{ background: 'var(--bg)', border: '1px solid var(--border-muted)', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', minWidth: 80 }}
              >
                {versions.map((v) => (
                  <button
                    key={v.version}
                    onClick={() => { data.onVersionSelect?.(v.version, v.label || `v${v.version}`); setVersionOpen(false) }}
                    className="w-full text-left px-2.5 py-2 text-[10px] font-medium cursor-pointer transition-colors duration-100 flex items-center justify-between gap-2"
                    style={{
                      background: v.version === data.agentVersion ? 'var(--bg-light)' : 'transparent',
                      border: 'none',
                      color: v.version === data.agentVersion ? 'var(--text)' : 'var(--text-muted)',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-light)'; e.currentTarget.style.color = 'var(--text)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = v.version === data.agentVersion ? 'var(--bg-light)' : 'transparent'; e.currentTarget.style.color = v.version === data.agentVersion ? 'var(--text)' : 'var(--text-muted)' }}
                  >
                    <span>v{v.version}</span>
                    {v.label && <span className="text-[8px] truncate" style={{ color: 'var(--highlight)' }}>{v.label}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Handoff rows */}
      {handoffs.length > 0 && (
        <div style={{ borderTop: '1px solid var(--border-muted)' }}>
          {handoffs.map((h) => (
            <div key={h.toolName} className="flex items-center gap-1 px-2.5" style={{ height: 26, position: 'relative' }}>
              <FiArrowRight size={8} style={{ color: 'var(--c-tools)', flexShrink: 0 }} />
              <span className="text-[9px] font-medium font-mono truncate flex-1" style={{ color: 'var(--text-muted)' }}>
                {h.label}
              </span>
              <Handle type="source" position={Position.Right} id={h.toolName} style={{ background: 'var(--c-tools)', width: 6, height: 6, border: '1.5px solid var(--bg-dark)' }} />
            </div>
          ))}
        </div>
      )}

      {handoffs.length === 0 && (
        <Handle type="source" position={Position.Right} id="default" style={{ background: 'var(--border)', width: 6, height: 6, border: '1.5px solid var(--bg-dark)' }} />
      )}
    </div>
  )
}

/* ───── Pipeline Tool Node ───── */

function PipelineToolNode({ data, selected }: { data: PipelineToolNodeData; selected?: boolean }) {
  const [open, setOpen] = useState(false)
  const [menuPos, setMenuPos] = useState<{ top: number; left: number; width: number }>({ top: 0, left: 0, width: 0 })
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const items = data.items || []

  useEffect(() => {
    if (!open) return
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      setMenuPos({ top: rect.bottom + 4, left: rect.left, width: Math.max(rect.width, 180) })
    }
    function handleClick(e: MouseEvent) {
      if (triggerRef.current?.contains(e.target as globalThis.Node) || menuRef.current?.contains(e.target as globalThis.Node)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  return (
    <div className="rounded-md" style={{ background: 'var(--bg)', border: `1.5px solid ${selected ? 'var(--c-tools)' : 'var(--border-muted)'}`, width: 150 }}>
      <Handle type="target" position={Position.Top} id="input-top" style={handleStyle('var(--c-tools)')} />
      <Handle type="target" position={Position.Left} id="input-left" style={handleStyle('var(--c-tools)')} />
      <Handle type="target" position={Position.Bottom} id="input-bottom" style={handleStyle('var(--c-tools)')} />

      <div className="flex items-center gap-1 px-2 py-1" style={{ background: 'var(--bg-light)', borderRadius: '5px 5px 0 0' }}>
        <LuWrench size={8} style={{ color: 'var(--c-tools)' }} />
        <span className="text-[8px] font-semibold uppercase tracking-wider" style={{ color: 'var(--highlight)' }}>Tool</span>
      </div>

      <div className="px-1.5 py-1.5" onClick={(e) => e.stopPropagation()}>
        <button
          ref={triggerRef}
          onClick={() => setOpen(!open)}
          className="w-full flex items-center justify-between px-2 py-1.5 rounded cursor-pointer"
          style={{ background: 'var(--bg-light)', border: '1px solid var(--border-muted)', color: 'var(--text)' }}
        >
          <span className="text-[9px] font-medium truncate">{data.label}</span>
          <FiChevronDown size={8} style={{ color: 'var(--highlight)', flexShrink: 0 }} />
        </button>
        {open && items.length > 0 && createPortal(
          <div
            ref={menuRef}
            className="rounded-lg py-1"
            style={{
              position: 'fixed',
              top: menuPos.top,
              left: menuPos.left,
              width: menuPos.width,
              zIndex: 99999,
              pointerEvents: 'auto',
              background: 'var(--bg)',
              border: '1px solid var(--border-muted)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              maxHeight: 240,
              overflowY: 'auto',
            }}
          >
            {items.map((item) => (
              <button
                key={item.id}
                onClick={() => { data.onSelect?.(item.name); setOpen(false) }}
                className="w-full text-left px-3 py-2.5 text-[13px] font-medium cursor-pointer transition-colors duration-100"
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-light)'; e.currentTarget.style.color = 'var(--text)' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)' }}
              >
                {item.name}
              </button>
            ))}
          </div>,
          getPortalRoot(),
        )}
      </div>

      <Handle type="source" position={Position.Right} id="output" style={{ background: 'var(--c-tools)', width: 6, height: 6, border: '1.5px solid var(--bg-dark)' }} />
    </div>
  )
}

/* ───── Node types map ───── */

export const nodeTypes: NodeTypes = {
  start: PipelineStartNode,
  'pipeline-agent': PipelineAgentNode,
  'pipeline-tool': PipelineToolNode,
}
