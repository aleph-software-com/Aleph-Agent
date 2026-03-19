import { useState } from 'react'
import { FiCheckCircle, FiInfo, FiAlertCircle, FiChevronRight, FiChevronDown, FiDatabase, FiGitBranch, FiArrowRight } from 'react-icons/fi'
import { LuListChecks, LuWrench } from 'react-icons/lu'

import type { DebugEntry } from './types'

const iconMap = {
  tool_call: LuWrench,
  tool_result: LuWrench,
  task_enter: LuListChecks,
  task_exit: LuListChecks,
  info: FiInfo,
  context_compact: FiDatabase,
  condition_eval: FiGitBranch,
  handoff: FiArrowRight,
}

const colorMap = {
  tool_call: 'var(--c-tools)',
  tool_result: 'var(--c-tools)',
  task_enter: 'var(--c-task)',
  task_exit: 'var(--c-task)',
  info: 'var(--highlight)',
  context_compact: 'var(--c-context)',
  condition_eval: 'var(--c-condition)',
  handoff: 'var(--c-pipeline)',
}

const labelMap = {
  tool_call: 'TOOL CALL',
  tool_result: 'TOOL RESULT',
  task_enter: 'TASK',
  task_exit: 'TASK EXIT',
  info: 'INFO',
  context_compact: 'CONTEXT COMPACTED',
  condition_eval: 'CONDITION',
  handoff: 'HANDOFF',
}

export default function DebugMessage({ entry }: { entry: DebugEntry }) {
  const Icon = iconMap[entry.type] || FiAlertCircle
  const color = colorMap[entry.type] || 'var(--highlight)'
  const label = labelMap[entry.type] || 'DEBUG'
  const time = new Date(entry.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })

  const isLong = entry.type === 'tool_result' && entry.content.length > 200
  const [open, setOpen] = useState(!isLong)

  return (
    <div
      className="flex items-start gap-2 px-4 py-2 mx-4 rounded-lg"
      style={{ background: 'var(--bg)', border: `1px solid ${entry.type === 'context_compact' ? 'var(--c-context)' : 'var(--border-muted)'}` }}
    >
      <Icon size={13} style={{ color, marginTop: 2, flexShrink: 0 }} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color }}>
            {label}
          </span>
          <span className="text-[11px]" style={{ color: 'var(--highlight)' }}>{time}</span>
          {isLong && (
            <button
              onClick={() => setOpen(!open)}
              className="flex items-center gap-0.5 cursor-pointer"
              style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', padding: 0 }}
            >
              {open ? <FiChevronDown size={10} /> : <FiChevronRight size={10} />}
              <span className="text-[10px]">{open ? 'collapse' : 'expand'}</span>
            </button>
          )}
        </div>

        <p className="text-[13px] font-mono break-all leading-relaxed mt-0.5 m-0" style={{ color: 'var(--text-muted)' }}>
          {isLong && !open ? `${entry.content.slice(0, 120)}...` : entry.content}
        </p>
        {entry.type === 'handoff' && entry.reason && (
          <p className="text-[12px] mt-0.5 m-0" style={{ color: 'var(--text-muted)' }}>
            Raison : {entry.reason}
          </p>
        )}

        {isLong && open && (
          <div
            className="mt-1 overflow-y-auto rounded"
            style={{ maxHeight: 200, background: 'var(--bg-dark)', padding: '4px 6px' }}
          >
            <p className="text-[13px] font-mono break-all leading-relaxed m-0" style={{ color: 'var(--text-muted)' }}>
              {entry.content}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
