import { RiRobot3Line } from 'react-icons/ri'
import { LuMessageSquare } from 'react-icons/lu'
import type { HandoffData, ContextMessage } from '../types'
import ContextTransferBlock from './ContextTransferBlock'

export default function HandoffBlocks({ handoff, messages }: { handoff: HandoffData; messages: ContextMessage[] }) {
  return (
    <>
      {/* Next Agent */}
      <div
        style={{ borderLeft: '2px solid var(--c-agent)', background: 'var(--bg)' }}
        className="rounded-r-md overflow-hidden"
      >
        <div className="flex items-center gap-2 px-3 py-2">
          <RiRobot3Line size={14} style={{ color: 'var(--c-agent)', flexShrink: 0 }} />
          <span className="text-[13px] font-bold uppercase tracking-wider" style={{ color: 'var(--c-agent)', flexShrink: 0 }}>
            Next Agent
          </span>
        </div>
      </div>

      {/* System Prompt (empty) */}
      <div
        style={{ borderLeft: '2px solid var(--c-prompt)', background: 'var(--bg)' }}
        className="rounded-r-md overflow-hidden"
      >
        <div className="flex items-center gap-2 px-3 py-2">
          <LuMessageSquare size={14} style={{ color: 'var(--c-prompt)', flexShrink: 0 }} />
          <span className="text-[13px] font-bold uppercase tracking-wider" style={{ color: 'var(--c-prompt)', flexShrink: 0 }}>
            System Prompt
          </span>
          <span className="text-[13px] italic" style={{ color: 'var(--text-muted)' }}>
            (en attente)
          </span>
        </div>
      </div>

      <ContextTransferBlock handoff={handoff} messages={messages} />
    </>
  )
}
