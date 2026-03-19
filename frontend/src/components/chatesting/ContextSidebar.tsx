import { useMemo, useEffect, useRef } from 'react'
import { FiArrowLeft, FiCpu, FiRefreshCw } from 'react-icons/fi'
import { RiRobot3Line } from 'react-icons/ri'
import { LuLayers, LuWrench } from 'react-icons/lu'
import type { ContextMessage, Compaction, HandoffData } from './types'
import PipelineBlock from './context/PipelineBlock'
import AgentBlock from './context/AgentBlock'
import MessageBlock from './context/MessageBlock'
import CompactionBlock from './context/CompactionBlock'
import HandoffBlocks from './context/HandoffBlocks'
import ContextTransferBlock from './context/ContextTransferBlock'

interface ContextSidebarProps {
  name?: string
  isPipeline?: boolean
  onBack?: () => void
  onReset?: () => void
  messages: ContextMessage[]
  tools?: string[]
  compaction?: Compaction | null
  handoff?: HandoffData | null
  totalUsage?: { prompt_tokens: number; completion_tokens: number }
}

function ToolsBlock({ tools }: { tools: string[] }) {
  if (tools.length === 0) return null
  return (
    <div
      style={{ borderLeft: '2px solid var(--c-tools)', background: 'var(--bg)' }}
      className="rounded-r-md overflow-hidden"
    >
      <div className="flex items-center gap-2 px-3 py-2">
        <LuWrench size={14} style={{ color: 'var(--c-tools)', flexShrink: 0 }} />
        <span className="text-[13px] font-bold uppercase tracking-wider" style={{ color: 'var(--c-tools)', flexShrink: 0 }}>
          Tools
        </span>
        <span className="text-[12px] ml-auto px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-dark)', color: 'var(--text-muted)' }}>
          {tools.length}
        </span>
      </div>
      <div className="px-4 pb-2.5 flex flex-wrap gap-1.5">
        {tools.map((name) => (
          <span
            key={name}
            className="text-[12px] font-mono px-2 py-0.5 rounded"
            style={{ background: 'var(--bg-dark)', color: 'var(--c-tools)', border: '1px solid var(--border-muted)' }}
          >
            {name}
          </span>
        ))}
      </div>
    </div>
  )
}

function ContextBody({ messages, tools, compaction, handoff }: ContextSidebarProps) {
  const hasPipeline = messages.length > 0 && messages[0].role === 'pipeline'

  // Split messages into header (agent/pipeline/system) and conversation history
  const splitAt = useMemo(() => {
    const headerRoles = new Set(['agent', 'pipeline', 'system'])
    const idx = messages.findIndex((m) => !headerRoles.has(m.role))
    return idx === -1 ? messages.length : idx
  }, [messages])

  if (handoff && !hasPipeline) {
    return <HandoffBlocks handoff={handoff} messages={messages} />
  }

  return (
    <>
      {/* Header messages: pipeline, agent, system prompt, task, memory */}
      {messages.slice(0, splitAt).map((msg, i) => {
        if (msg.role === 'pipeline') return <PipelineBlock key={i} msg={msg} />
        if (msg.role === 'agent') return <AgentBlock key={i} msg={msg} index={hasPipeline ? 1 : 0} />
        return <MessageBlock key={i} msg={msg} index={i} hasPipeline={hasPipeline} />
      })}

      {/* Tools available to the LLM */}
      {tools && <ToolsBlock tools={tools} />}

      {/* Context transfer block (pipeline handoff) */}
      {handoff && hasPipeline && (
        <ContextTransferBlock handoff={handoff} messages={messages} />
      )}

      {/* Compaction info */}
      {compaction && <CompactionBlock compaction={compaction} />}

      {/* Conversation history: user, assistant, tool */}
      {messages.slice(splitAt).map((msg, i) => (
        <MessageBlock key={splitAt + i} msg={msg} index={splitAt + i} hasPipeline={hasPipeline} />
      ))}
    </>
  )
}

export default function ContextSidebar({ name, isPipeline, onBack, onReset, messages, tools, compaction, handoff, totalUsage }: ContextSidebarProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const NavIcon = isPipeline ? LuLayers : RiRobot3Line

  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages])

  return (
    <div
      className="h-full flex flex-col"
      style={{ background: 'var(--bg-dark)', borderLeft: '1px solid var(--border-muted)' }}
    >
      {/* Agent name + back + reset */}
      {name && (
        <div className="shrink-0 px-4 h-11 flex items-center gap-2">
          {onBack ? (
            <button
              onClick={onBack}
              className="flex items-center justify-center cursor-pointer shrink-0"
              style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', padding: 0, width: 14 }}
              onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text)' }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)' }}
            >
              <FiArrowLeft size={14} />
            </button>
          ) : (
            <NavIcon size={14} style={{ color: isPipeline ? 'var(--info)' : 'var(--primary)', flexShrink: 0 }} />
          )}
          <span className="text-[13px] font-semibold truncate" style={{ color: 'var(--text)' }}>{name}</span>
          {onReset && (
            <button
              onClick={onReset}
              className="flex items-center justify-center w-6 h-6 rounded-md cursor-pointer shrink-0"
              style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', padding: 0 }}
              onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text)' }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)' }}
              title="Reset chat"
            >
              <FiRefreshCw size={12} />
            </button>
          )}
        </div>
      )}

      {/* LLM Context header */}
      <div
        className="shrink-0 px-4 h-11 flex items-center gap-2"
        style={{ borderBottom: '1px solid var(--border-muted)' }}
      >
        <FiCpu size={14} style={{ color: 'var(--primary)' }} />
        <span className="text-[14px] font-semibold" style={{ color: 'var(--text)' }}>
          LLM Context :
        </span>
        <span className="text-[13px]" style={{ color: 'var(--text-muted)' }}>
          {messages.length} msgs
        </span>
        {totalUsage && (totalUsage.prompt_tokens > 0 || totalUsage.completion_tokens > 0) && (
          <span
            className="text-[13px] ml-auto px-2 py-0.5 rounded-full"
            style={{ background: 'var(--bg-light)', color: 'var(--text-muted)', border: '1px solid var(--border-muted)' }}
          >
            <span className="text-[14px] font-semibold" style={{ color: 'var(--text)' }}>total:</span> input {totalUsage.prompt_tokens.toLocaleString()} · output {totalUsage.completion_tokens.toLocaleString()}
          </span>
        )}
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-2.5 py-2.5 flex flex-col gap-1.5">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <span className="text-[14px] italic" style={{ color: 'var(--text-muted)' }}>
              Waiting for first call...
            </span>
          </div>
        ) : (
          <ContextBody messages={messages} tools={tools} compaction={compaction} handoff={handoff} />
        )}
      </div>
    </div>
  )
}
