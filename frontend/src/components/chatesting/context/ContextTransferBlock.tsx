import { useState } from 'react'
import { FiChevronRight, FiChevronDown, FiDatabase } from 'react-icons/fi'
import type { HandoffData, ContextMessage } from '../types'
import { contextLabel } from './helpers'
import SnapshotList from './SnapshotList'

export default function ContextTransferBlock({ handoff, messages }: { handoff: HandoffData; messages: ContextMessage[] }) {
  const [ctxOpen, setCtxOpen] = useState(false)
  const opts = handoff.context_options?.length ? handoff.context_options : []
  const hasFull = opts.includes('full')
  const hasExtracted = opts.includes('extracted')
  const sourceMessages = handoff.previous_messages || messages
  const convMessages = sourceMessages.filter((m) => m.role !== 'agent' && m.role !== 'pipeline' && m.role !== 'system')
  const extractedMessages = convMessages.filter((m) => m.role === 'tool')

  return (
    <div
      style={{ borderLeft: '2px solid var(--c-context)', background: 'var(--bg)' }}
      className="rounded-r-md overflow-hidden"
    >
      <button
        onClick={() => setCtxOpen(!ctxOpen)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left cursor-pointer"
        style={{ background: 'transparent', border: 'none' }}
      >
        {ctxOpen ? <FiChevronDown size={12} style={{ color: 'var(--text-muted)', flexShrink: 0 }} /> : <FiChevronRight size={12} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />}
        <FiDatabase size={14} style={{ color: 'var(--c-context)', flexShrink: 0 }} />
        <span className="text-[13px] font-bold uppercase tracking-wider" style={{ color: 'var(--c-context)', flexShrink: 0 }}>
          Contexte
        </span>
        {!ctxOpen && (
          <span className="text-[13px] truncate" style={{ color: 'var(--text-muted)' }}>
            {opts.length > 0 ? opts.map(contextLabel).join(', ') : 'Aucun contexte'}
          </span>
        )}
      </button>

      {ctxOpen && (
        <div className="px-4 pb-2.5 flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <span className="text-[12px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
              Type
            </span>
            <span className="text-[13px] font-medium" style={{ color: 'var(--text)' }}>
              {opts.length > 0 ? opts.map(contextLabel).join(', ') : 'No context'}
            </span>
          </div>
          {hasExtracted && extractedMessages.length > 0 && (
            <SnapshotList label="Extracted data" messages={extractedMessages} color="var(--c-tools)" />
          )}
          {hasFull && convMessages.length > 0 && (
            <SnapshotList label="Full history" messages={convMessages} color="var(--c-context)" />
          )}
        </div>
      )}
    </div>
  )
}
