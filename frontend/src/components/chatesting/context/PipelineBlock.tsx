import { LuLayers } from 'react-icons/lu'
import type { ContextMessage } from '../types'

export default function PipelineBlock({ msg }: { msg: ContextMessage }) {
  return (
    <div
      style={{ borderLeft: '2px solid var(--c-pipeline)', background: 'var(--bg)' }}
      className="rounded-r-md overflow-hidden"
    >
      <div className="flex items-center gap-2 px-3 py-2">
        <LuLayers size={14} style={{ color: 'var(--c-pipeline)', flexShrink: 0 }} />
        <span className="text-[13px] font-bold uppercase tracking-wider" style={{ color: 'var(--c-pipeline)', flexShrink: 0 }}>
          [0] Pipeline
        </span>
      </div>
      <div className="px-4 pb-2.5 flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="text-[13px]" style={{ color: 'var(--text-muted)' }}>name</span>
          <span className="text-[14px] font-semibold" style={{ color: 'var(--text)' }}>{msg.name}</span>
        </div>
      </div>
    </div>
  )
}
