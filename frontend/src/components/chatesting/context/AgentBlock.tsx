import { FiThermometer } from 'react-icons/fi'
import { RiRobot3Line } from 'react-icons/ri'
import type { ContextMessage } from '../types'

export default function AgentBlock({ msg, index }: { msg: ContextMessage; index: number }) {
  return (
    <div
      style={{ borderLeft: '2px solid var(--c-agent)', background: 'var(--bg)' }}
      className="rounded-r-md overflow-hidden"
    >
      <div className="flex items-center gap-2 px-3 py-2">
        <RiRobot3Line size={14} style={{ color: 'var(--c-agent)', flexShrink: 0 }} />
        <span className="text-[13px] font-bold uppercase tracking-wider" style={{ color: 'var(--c-agent)', flexShrink: 0 }}>
          [{index}] Agent
        </span>
      </div>
      <div className="px-4 pb-2.5 flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <span className="text-[13px]" style={{ color: 'var(--text-muted)' }}>name</span>
          <span className="text-[14px] font-semibold" style={{ color: 'var(--text)' }}>{msg.name}</span>
        </div>
        <div className="flex items-center gap-2">
          <FiThermometer size={12} style={{ color: 'var(--text-muted)' }} />
          <span className="text-[13px]" style={{ color: 'var(--text-muted)' }}>temperature</span>
          <span className="text-[13px] font-mono font-semibold" style={{ color: 'var(--warning)' }}>{msg.temperature}</span>
        </div>
      </div>
    </div>
  )
}
