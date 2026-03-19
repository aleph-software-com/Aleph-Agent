import { RiRobot3Line } from 'react-icons/ri'
import { LuWrench } from 'react-icons/lu'

interface ContextMenuProps {
  x: number
  y: number
  onAddAgent: () => void
  onAddTool: () => void
  onClose: () => void
}

const items = [
  { key: 'agent', icon: RiRobot3Line, color: 'var(--c-agent)', label: 'Agent', sub: 'Ajouter un agent' },
  { key: 'tool', icon: LuWrench, color: 'var(--c-tools)', label: 'Tool', sub: 'Ajouter un outil' },
]

export default function ContextMenu({ x, y, onAddAgent, onAddTool, onClose }: ContextMenuProps) {
  const handlers: Record<string, () => void> = { agent: onAddAgent, tool: onAddTool }

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        className="absolute z-50 rounded-xl overflow-hidden py-1"
        style={{
          left: x,
          top: y,
          background: 'var(--bg)',
          border: '1px solid var(--border-muted)',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          minWidth: 180,
        }}
      >
        {items.map(({ key, icon: Icon, color, label, sub }) => (
          <button
            key={key}
            onClick={handlers[key]}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors duration-150 cursor-pointer"
            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-light)'; e.currentTarget.style.color = 'var(--text)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)' }}
          >
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'var(--bg-light)', border: '1px solid var(--border-muted)' }}>
              <Icon size={13} style={{ color }} />
            </div>
            <div>
              <div className="text-[13px] font-medium">{label}</div>
              <div className="text-[11px]" style={{ color: 'var(--highlight)' }}>{sub}</div>
            </div>
          </button>
        ))}
      </div>
    </>
  )
}
