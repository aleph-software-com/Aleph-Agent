import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Handle, Position, type NodeTypes } from '@xyflow/react'
import { FiFlag, FiChevronDown } from 'react-icons/fi'
import { RiRobot3Line } from 'react-icons/ri'
import { LuListChecks, LuWrench } from 'react-icons/lu'
import type { TaskDef, ToolDef } from './types'

function getPortalRoot() {
  return document.getElementById('portal-root') || document.body
}

/* ───── Shared portal dropdown for Task & Tool nodes ───── */

interface NodeDropdownProps {
  label: string
  items: { id: string; name: string }[]
  onSelect?: (name: string) => void
  color: string
}

function NodeDropdown({ label, items, onSelect, color }: NodeDropdownProps) {
  const [open, setOpen] = useState(false)
  const [menuPos, setMenuPos] = useState<{ top: number; left: number; width: number }>({ top: 0, left: 0, width: 0 })
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      setMenuPos({ top: rect.bottom + 4, left: rect.left, width: Math.max(rect.width, 180) })
    }
    function handleClick(e: MouseEvent) {
      if (triggerRef.current?.contains(e.target as Node) || menuRef.current?.contains(e.target as Node)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  return (
    <div className="px-1.5 py-1.5" onClick={(e) => e.stopPropagation()}>
      <button
        ref={triggerRef}
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-1.5 py-1 rounded cursor-pointer"
        style={{ background: 'var(--bg-light)', border: '1px solid var(--border-muted)', color: 'var(--text)' }}
      >
        <span className="text-[9px] font-medium truncate">{label}</span>
        <FiChevronDown size={8} style={{ color: 'var(--highlight)', flexShrink: 0, transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
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
              onClick={() => { onSelect?.(item.name); setOpen(false) }}
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
  )
}

/* ───── Handle style helper ───── */

const handleStyle = (color: string) => ({
  background: color,
  width: 6,
  height: 6,
  border: '1.5px solid var(--bg-dark)',
})

/* ───── Start Node ───── */

function StartNode() {
  return (
    <div
      className="flex items-center gap-1.5 px-2 py-1.5 rounded-md"
      style={{ background: 'var(--bg)', border: '1px solid var(--border-muted)' }}
    >
      <FiFlag size={10} style={{ color: 'var(--success)' }} />
      <span className="text-[9px] font-semibold" style={{ color: 'var(--text-muted)' }}>Start</span>
      <Handle type="source" position={Position.Right} style={handleStyle('var(--border)')} />
    </div>
  )
}

/* ───── Agent Node ───── */

function AgentNode({ data, selected }: { data: { label: string }; selected?: boolean }) {
  return (
    <div className="rounded-md overflow-hidden" style={{ background: 'var(--bg)', border: `1px solid ${selected ? 'var(--c-agent)' : 'var(--border-muted)'}`, width: 110 }}>
      <Handle id="top" type="source" position={Position.Top} style={handleStyle('var(--c-agent)')} />
      <Handle id="left" type="source" position={Position.Left} style={handleStyle('var(--c-agent)')} />
      <div className="flex items-center gap-1 px-2 py-1" style={{ background: 'var(--bg-light)' }}>
        <RiRobot3Line size={8} style={{ color: 'var(--c-agent)' }} />
        <span className="text-[8px] font-semibold uppercase tracking-wider" style={{ color: 'var(--highlight)' }}>Agent</span>
      </div>
      <div className="px-2 py-1.5">
        <span className="text-[9px] font-medium" style={{ color: 'var(--text)' }}>{data.label}</span>
      </div>
      <Handle id="bottom" type="source" position={Position.Bottom} style={handleStyle('var(--c-agent)')} />
      <Handle id="right" type="source" position={Position.Right} style={handleStyle('var(--c-agent)')} />
    </div>
  )
}

/* ───── Task Node ───── */

function TaskNode({ data, selected }: { data: { label: string; items?: TaskDef[]; onSelect?: (name: string) => void }; selected?: boolean }) {
  return (
    <div className="rounded-md" style={{ background: 'var(--bg)', border: `1px solid ${selected ? 'var(--c-task)' : 'var(--border-muted)'}`, width: 130 }}>
      <Handle id="top" type="source" position={Position.Top} style={handleStyle('var(--c-task)')} />
      <Handle id="left" type="source" position={Position.Left} style={handleStyle('var(--c-task)')} />
      <div className="flex items-center gap-1 px-2 py-1" style={{ background: 'var(--bg-light)', borderRadius: '5px 5px 0 0' }}>
        <LuListChecks size={8} style={{ color: 'var(--c-task)' }} />
        <span className="text-[8px] font-semibold uppercase tracking-wider" style={{ color: 'var(--highlight)' }}>Task</span>
      </div>
      <NodeDropdown label={data.label} items={data.items || []} onSelect={data.onSelect} color="var(--c-task)" />
      <Handle id="bottom" type="source" position={Position.Bottom} style={handleStyle('var(--c-task)')} />
      <Handle id="right" type="source" position={Position.Right} style={handleStyle('var(--c-task)')} />
    </div>
  )
}

/* ───── Tool Node ───── */

function ToolNode({ data, selected }: { data: { label: string; items?: ToolDef[]; onSelect?: (name: string) => void }; selected?: boolean }) {
  return (
    <div className="rounded-md" style={{ background: 'var(--bg)', border: `1px solid ${selected ? 'var(--c-tools)' : 'var(--border-muted)'}`, width: 130 }}>
      <Handle id="top" type="source" position={Position.Top} style={handleStyle('var(--c-tools)')} />
      <Handle id="left" type="source" position={Position.Left} style={handleStyle('var(--c-tools)')} />
      <div className="flex items-center gap-1 px-2 py-1" style={{ background: 'var(--bg-light)', borderRadius: '5px 5px 0 0' }}>
        <LuWrench size={8} style={{ color: 'var(--c-tools)' }} />
        <span className="text-[8px] font-semibold uppercase tracking-wider" style={{ color: 'var(--highlight)' }}>Tool</span>
      </div>
      <NodeDropdown label={data.label} items={data.items || []} onSelect={data.onSelect} color="var(--c-tools)" />
      <Handle id="bottom" type="source" position={Position.Bottom} style={handleStyle('var(--c-tools)')} />
      <Handle id="right" type="source" position={Position.Right} style={handleStyle('var(--c-tools)')} />
    </div>
  )
}

/* ───── Node types map ───── */

export const nodeTypes: NodeTypes = {
  start: StartNode,
  agent: AgentNode,
  task: TaskNode,
  tool: ToolNode,
}
