import { useState, useRef, useEffect } from 'react'
import { FiArrowUp, FiMic, FiMicOff } from 'react-icons/fi'

interface ChatInputProps {
  onSend: (message: string) => void
  disabled: boolean
  sttEnabled: boolean
  voiceActive: boolean
  onVoiceToggle: () => void
  voiceTranscript?: string
}

export default function ChatInput({ onSend, disabled, sttEnabled, voiceActive, onVoiceToggle, voiceTranscript }: ChatInputProps) {
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
    if (!trimmed || disabled || voiceActive) return
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

  const canSend = value.trim().length > 0 && !disabled && !voiceActive

  return (
    <div
      className="shrink-0 pb-6 pt-2 px-4"
      style={{ background: 'var(--bg-dark)' }}
    >
      <div
        className="max-w-3xl mx-auto relative"
        style={{
          background: 'var(--bg)',
          border: `1px solid ${voiceActive ? 'var(--primary)' : 'var(--border)'}`,
          borderRadius: 20,
          boxShadow: voiceActive ? '0 0 20px rgba(168,196,235,0.1)' : '0 2px 12px rgba(0,0,0,0.06)',
          transition: 'border-color 0.2s, box-shadow 0.2s',
        }}
      >
        {voiceActive ? (
          <div
            className="flex items-center gap-3 w-full"
            style={{ padding: '16px 52px 16px 20px', minHeight: 56 }}
          >
            {/* Pulsing dot */}
            <div className="relative flex items-center justify-center">
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{
                  background: 'var(--danger)',
                  animation: 'pulse 1.5s ease-in-out infinite',
                }}
              />
            </div>
            <span className="text-[14px] flex-1" style={{ color: voiceTranscript ? 'var(--text)' : 'var(--highlight)' }}>
              {voiceTranscript || 'Listening...'}
            </span>
          </div>
        ) : (
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
        )}

        {/* Right-side buttons */}
        <div className="absolute right-3 bottom-3 flex items-center gap-1.5">
          {/* Mic button — only shown if STT is enabled on agent */}
          {sttEnabled && (
            <button
              onClick={onVoiceToggle}
              disabled={disabled}
              className="flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-200 cursor-pointer"
              style={{
                background: voiceActive ? 'var(--danger)' : 'var(--bg-light)',
                color: voiceActive ? '#fff' : 'var(--highlight)',
                border: 'none',
                opacity: disabled ? 0.4 : 1,
              }}
            >
              {voiceActive ? <FiMicOff size={15} strokeWidth={2.5} /> : <FiMic size={15} strokeWidth={2.5} />}
            </button>
          )}

          {/* Send button — hidden in voice mode */}
          {!voiceActive && (
            <button
              onClick={handleSend}
              disabled={!canSend}
              className="flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-200 cursor-pointer"
              style={{
                background: canSend ? 'var(--primary)' : 'var(--bg-light)',
                color: canSend ? 'var(--bg-dark)' : 'var(--highlight)',
                border: 'none',
              }}
            >
              <FiArrowUp size={16} strokeWidth={2.5} />
            </button>
          )}
        </div>
      </div>
      <p className="text-center text-[11px] mt-2" style={{ color: 'var(--highlight)' }}>
        Test chat — messages are not saved
      </p>
    </div>
  )
}
