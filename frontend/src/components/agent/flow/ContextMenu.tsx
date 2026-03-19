import { LuListChecks, LuWrench } from 'react-icons/lu'

interface ContextMenuProps {
  x: number
  y: number
  onAdd: (type: 'task' | 'tool') => void
  onClose: () => void
}

const items = [
  { type: 'task' as const, icon: LuListChecks, color: 'var(--c-task)', label: 'Task', sub: 'Ajouter une tâche' },
  { type: 'tool' as const, icon: LuWrench, color: 'var(--c-tools)', label: 'Tool', sub: 'Ajouter un outil' },
]

export default function ContextMenu({ x, y, onAdd, onClose }: ContextMenuProps) {
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
        {items.map(({ type, icon: Icon, color, label, sub }) => (
          <button
            key={type}
            onClick={() => onAdd(type)}
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
