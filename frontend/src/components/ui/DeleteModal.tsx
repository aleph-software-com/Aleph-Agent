import { FiX, FiTrash2, FiAlertTriangle } from 'react-icons/fi'

interface DeleteModalProps {
  title: string
  name: string
  description?: string
  onConfirm: () => void
  onCancel: () => void
}

export default function DeleteModal({ title, name, description, onConfirm, onCancel }: DeleteModalProps) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}>
      <div
        className="rounded-xl overflow-hidden"
        style={{
          background: 'var(--bg)',
          border: '1px solid var(--border-muted)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          width: 380,
        }}
      >
        <div className="px-6 pt-6 pb-4 flex flex-col items-center gap-3 text-center">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.2)' }}
          >
            <FiAlertTriangle size={20} style={{ color: 'var(--danger)' }} />
          </div>
          <div>
            <h3 className="text-[15px] font-semibold mb-1" style={{ color: 'var(--text)' }}>
              {title}
            </h3>
            <p className="text-[13px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              {description || (
                <>Are you sure you want to delete <strong style={{ color: 'var(--text)' }}>{name}</strong>? This action cannot be undone.</>
              )}
            </p>
          </div>
        </div>

        <div
          className="flex items-center gap-2.5 px-6 py-4"
          style={{ borderTop: '1px solid var(--border-muted)', background: 'var(--bg-light)' }}
        >
          <button
            onClick={onCancel}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-[12px] font-medium cursor-pointer transition-colors duration-150"
            style={{ background: 'var(--bg)', border: '1px solid var(--border-muted)', color: 'var(--text-muted)' }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text)' }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-muted)'; e.currentTarget.style.color = 'var(--text-muted)' }}
          >
            <FiX size={13} />
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-[12px] font-semibold cursor-pointer transition-all duration-150"
            style={{ background: 'var(--danger)', color: '#fff', border: 'none' }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.9' }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '1' }}
          >
            <FiTrash2 size={13} />
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}
