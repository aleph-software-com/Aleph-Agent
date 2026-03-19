import { useState, useRef, useEffect } from 'react'
import { FiArrowUp } from 'react-icons/fi'

interface ChatInputProps {
  onSend: (message: string) => void
  disabled: boolean
}

export default function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [value, setValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px'
    }
  }, [value])

  const handleSend = () => {
    const trimmed = value.trim()
    if (!trimmed || disabled) return
    onSend(trimmed)
    setValue('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const canSend = value.trim().length > 0 && !disabled

  return (
    <div
      className="shrink-0 pb-6 pt-2 px-4"
      style={{ background: 'var(--bg-dark)' }}
    >
      <div
        className="max-w-3xl mx-auto relative"
        style={{
          background: 'var(--bg)',
          border: '1px solid var(--border)',
          borderRadius: 20,
          boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
        }}
      >
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Envoyer un message..."
          disabled={disabled}
          rows={1}
          className="chat-textarea w-full resize-none text-[15px] leading-relaxed"
          style={{
            padding: '16px 52px 16px 20px',
            color: 'var(--text)',
            minHeight: 56,
            maxHeight: 200,
            opacity: disabled ? 0.5 : 1,
            overflow: 'auto',
            scrollbarWidth: 'none',
          }}
        />
        <button
          onClick={handleSend}
          disabled={!canSend}
          className="absolute right-3 bottom-3 flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-200 cursor-pointer"
          style={{
            background: canSend ? 'var(--primary)' : 'var(--bg-light)',
            color: canSend ? 'var(--bg-dark)' : 'var(--highlight)',
            border: 'none',
          }}
        >
          <FiArrowUp size={16} strokeWidth={2.5} />
        </button>
      </div>
      <p className="text-center text-[11px] mt-2" style={{ color: 'var(--highlight)' }}>
        Test chat — messages are not saved
      </p>
    </div>
  )
}
