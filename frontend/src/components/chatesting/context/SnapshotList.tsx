import { msgPreview } from './helpers'

export default function SnapshotList({ label, messages, color }: { label: string; messages: any[]; color: string }) {
  return (
    <div>
      <div className="text-[12px] font-bold uppercase tracking-wider mb-1" style={{ color }}>
        {label} ({messages.length})
      </div>
      <div
        className="overflow-y-auto rounded flex flex-col gap-0.5"
        style={{ maxHeight: 200, background: 'var(--bg-dark)', padding: '4px 6px' }}
      >
        {messages.map((msg, i) => (
          <div key={i} className="text-[12px] font-mono truncate" style={{ color: 'var(--text-muted)' }}>
            <span style={{ color: msg.role === 'user' ? 'var(--c-user)' : msg.role === 'assistant' ? 'var(--c-agent)' : msg.role === 'tool' ? 'var(--c-tools)' : 'var(--c-task)' }}>
              [{i}]
            </span>{' '}
            {msgPreview(msg)}
          </div>
        ))}
      </div>
    </div>
  )
}
