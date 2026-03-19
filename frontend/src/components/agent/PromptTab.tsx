import { useState, useEffect, useRef } from 'react'

interface PromptTabProps {
  prompt: string
  onUpdate: (prompt: string) => void
  title?: string
  placeholder?: string
  description?: string
}

export default function PromptTab({
  prompt,
  onUpdate,
  title = 'System Prompt',
  placeholder = 'Describe your agent\'s behavior...',
  description = 'The system prompt defines the agent\'s personality and base instructions. It is sent to the LLM on every conversation.',
}: PromptTabProps) {
  const [text, setText] = useState(prompt || '')
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => { setText(prompt || '') }, [prompt])

  const handleChange = (value: string) => {
    setText(value)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => onUpdate(value), 600)
  }

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current) }, [])

  return (
    <div className="flex flex-col gap-4 h-full">
      <div className="flex items-center justify-between shrink-0">
        <h3 className="text-[13px] font-semibold uppercase tracking-wider" style={{ color: 'var(--highlight)' }}>
          {title}
        </h3>
        <span className="text-[11px] font-medium px-2 py-0.5 rounded-md" style={{ background: 'var(--bg-light)', color: 'var(--highlight)' }}>
          {text.length} chars
        </span>
      </div>

      <div className="rounded-md overflow-hidden" style={{ background: 'var(--bg)', border: '1px solid var(--border-muted)', height: '90%', minHeight: 0 }}>
        <textarea
          value={text}
          onChange={(e) => handleChange(e.target.value)}
          className="w-full h-full resize-none text-[13px] leading-relaxed p-5 font-mono"
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text)',
            outline: 'none',
          }}
          placeholder={placeholder}
        />
      </div>

      <p className="text-[12px] leading-relaxed shrink-0" style={{ color: 'var(--highlight)' }}>
        {description}
      </p>
    </div>
  )
}
