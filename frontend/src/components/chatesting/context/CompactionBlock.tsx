import { useState } from 'react'
import { FiChevronRight, FiChevronDown, FiDatabase } from 'react-icons/fi'
import type { Compaction } from '../types'
import SnapshotList from './SnapshotList'

export default function CompactionBlock({ compaction }: { compaction: Compaction }) {
  const [open, setOpen] = useState(false)

  return (
    <div
      style={{ borderLeft: '2px solid var(--c-context)', background: 'var(--bg)' }}
      className="rounded-r-md overflow-hidden"
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left cursor-pointer"
        style={{ background: 'transparent', border: 'none' }}
      >
        {open ? <FiChevronDown size={12} style={{ color: 'var(--text-muted)', flexShrink: 0 }} /> : <FiChevronRight size={12} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />}
        <FiDatabase size={14} style={{ color: 'var(--c-context)', flexShrink: 0 }} />
        <span className="text-[13px] font-bold uppercase tracking-wider" style={{ color: 'var(--c-context)', flexShrink: 0 }}>
          Compaction
        </span>
        {!open && (
          <span className="text-[13px] truncate" style={{ color: 'var(--text-muted)' }}>
            {compaction.before_count} → {compaction.after_count} tours
          </span>
        )}
      </button>

      {open && (
        <div className="px-4 pb-3 flex flex-col gap-2">
          <p className="text-[13px] m-0" style={{ color: 'var(--text-muted)' }}>
            {compaction.description}
          </p>
          {compaction.summary && (
            <div className="rounded p-2.5" style={{ background: 'var(--primary-hover)', border: '1px solid var(--border)' }}>
              <div className="text-[12px] font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--c-context)' }}>
                Summary
              </div>
              <p className="text-[13px] leading-relaxed m-0" style={{ color: 'var(--text)' }}>
                {compaction.summary}
              </p>
            </div>
          )}
          <SnapshotList label="Before" messages={compaction.before} color="var(--danger)" />
          <SnapshotList label="After" messages={compaction.after} color="var(--success)" />
        </div>
      )}
    </div>
  )
}
