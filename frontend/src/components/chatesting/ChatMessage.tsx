import { RiRobot3Line } from 'react-icons/ri'
import type { TokenUsage } from './types'

interface ChatMessageProps {
  role: 'user' | 'assistant'
  content: string
  usage?: TokenUsage
}

export default function ChatMessage({ role, content, usage }: ChatMessageProps) {
  const isUser = role === 'user'

  if (isUser) {
    return (
      <div className="flex justify-end px-4">
        <div
          className="rounded-2xl px-4 py-3 max-w-[80%]"
          style={{
            background: 'var(--bg)',
            color: 'var(--text)',
            border: '1px solid var(--border-muted)',
          }}
        >
          <p className="text-[14px] leading-relaxed whitespace-pre-wrap">{content}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex gap-3 px-4">
      <div
        className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
        style={{ background: 'color-mix(in oklch, var(--c-agent) 15%, transparent)', border: '1px solid var(--border)' }}
      >
        <RiRobot3Line size={14} style={{ color: 'var(--c-agent)' }} />
      </div>
      <div className="flex-1 min-w-0 pt-0.5">
        <p
          className="text-[14px] leading-[1.7] whitespace-pre-wrap"
          style={{ color: 'var(--text)' }}
        >
          {content}
        </p>
        {usage && (
          <p className="text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>
            input {usage.prompt_tokens.toLocaleString()} · output {usage.completion_tokens.toLocaleString()}
          </p>
        )}
      </div>
    </div>
  )
}
