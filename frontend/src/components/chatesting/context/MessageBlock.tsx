import { useState } from 'react'
import { FiChevronRight, FiChevronDown } from 'react-icons/fi'
import type { ContextMessage } from '../types'
import { labelIcon, labelColor, roleLabel } from './helpers'

export default function MessageBlock({ msg, index, hasPipeline }: { msg: ContextMessage; index: number; hasPipeline?: boolean }) {
  const [open, setOpen] = useState(index <= (hasPipeline ? 2 : 1))
  const hasToolCalls = msg.tool_calls && msg.tool_calls.length > 0
  const label = roleLabel(msg.role, index, msg.content, hasToolCalls)
  const color = labelColor(label, msg.role)
  const preview = msg.content
    ? msg.content.length > 80 ? msg.content.slice(0, 80) + '...' : msg.content
    : hasToolCalls
      ? msg.tool_calls!.map((tc: any) => tc.function?.name).join(', ')
      : msg.tool_call_id
        ? `result for ${msg.tool_call_id.slice(0, 12)}...`
        : '(empty)'

  return (
    <div
      style={{ borderLeft: `2px solid ${color}`, background: 'var(--bg)' }}
      className="rounded-r-md overflow-hidden"
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left cursor-pointer"
        style={{ background: 'transparent', border: 'none' }}
      >
        {open ? <FiChevronDown size={12} style={{ color: 'var(--text-muted)', flexShrink: 0 }} /> : <FiChevronRight size={12} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />}
        <span style={{ color, flexShrink: 0 }}>{labelIcon(label, msg.role)}</span>
        <span className="text-[13px] font-bold uppercase tracking-wider" style={{ color, flexShrink: 0 }}>
          [{index}] {label}
        </span>
        {!open && (
          <span className="text-[13px] truncate" style={{ color: 'var(--text-muted)' }}>
            {preview}
          </span>
        )}
      </button>

      {open && (
        <div className="px-4 pb-2.5 overflow-y-auto" style={{ maxHeight: 100 }}>
          {msg.content && (
            <pre
              className="text-[14px] leading-relaxed whitespace-pre-wrap wrap-break-word m-0"
              style={{ color: 'var(--text)', fontFamily: 'inherit' }}
            >
              {msg.content}
            </pre>
          )}
          {hasToolCalls && (
            <div className="mt-1.5 flex flex-col gap-1.5">
              {msg.tool_calls!.map((tc: any, i: number) => (
                <div key={i} className="rounded px-2.5 py-1.5" style={{ background: 'var(--bg-dark)' }}>
                  <span className="text-[13px] font-bold" style={{ color: 'var(--secondary)' }}>
                    {tc.function?.name}
                  </span>
                  <pre className="text-[13px] mt-0.5 m-0 whitespace-pre-wrap break-all" style={{ color: 'var(--text-muted)' }}>
                    {tc.function?.arguments}
                  </pre>
                </div>
              ))}
            </div>
          )}
          {!msg.content && !hasToolCalls && (
            <span className="text-[13px] italic" style={{ color: 'var(--text-muted)' }}>(no content)</span>
          )}
        </div>
      )}
    </div>
  )
}
