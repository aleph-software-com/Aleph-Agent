import { useState, useEffect } from 'react'
import { FiLayers, FiFileText } from 'react-icons/fi'
import Section from '../ui/Section'

function Toggle({ enabled, onChange, label, description, icon: Icon }: {
  enabled: boolean
  onChange: (v: boolean) => void
  label: string
  description: string
  icon: React.ComponentType<{ size: number; style?: React.CSSProperties }>
}) {
  return (
    <div
      className="flex items-start gap-4 p-4 rounded-xl transition-all duration-200"
      style={{
        background: enabled ? 'var(--primary-hover)' : 'var(--bg-light)',
        border: `1px solid ${enabled ? 'var(--border)' : 'var(--border-muted)'}`,
      }}
    >
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
        style={{
          background: enabled ? 'var(--primary)' : 'var(--bg)',
          color: enabled ? 'var(--bg-dark)' : 'var(--highlight)',
        }}
      >
        <Icon size={16} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-semibold" style={{ color: 'var(--text)' }}>{label}</div>
        <p className="text-[12px] mt-0.5" style={{ color: 'var(--highlight)' }}>{description}</p>
      </div>
      <button
        onClick={() => onChange(!enabled)}
        className="relative w-10 h-5.5 rounded-full transition-all duration-200 cursor-pointer shrink-0 mt-1"
        style={{
          background: enabled ? 'var(--primary)' : 'var(--bg)',
          border: `1px solid ${enabled ? 'var(--primary)' : 'var(--border-muted)'}`,
          padding: 0,
        }}
      >
        <div
          className="absolute top-0.5 w-4 h-4 rounded-full transition-all duration-200"
          style={{
            background: enabled ? 'var(--bg-dark)' : 'var(--highlight)',
            left: enabled ? '20px' : '2px',
          }}
        />
      </button>
    </div>
  )
}

interface ContextTabProps {
  agent: any
  onUpdate: (data: any) => void
}

export default function ContextTab({ agent, onUpdate }: ContextTabProps) {
  const cfg = agent.llm_config || {}

  const [windowEnabled, setWindowEnabled] = useState(!!cfg.context_window?.enabled)
  const [windowSize, setWindowSize] = useState(cfg.context_window?.size || 10)
  const [summaryEnabled, setSummaryEnabled] = useState(!!cfg.context_summary?.enabled)
  const [summaryThreshold, setSummaryThreshold] = useState(cfg.context_summary?.threshold || 20)

  useEffect(() => {
    const c = agent.llm_config || {}
    setWindowEnabled(!!c.context_window?.enabled)
    setWindowSize(c.context_window?.size || 10)
    setSummaryEnabled(!!c.context_summary?.enabled)
    setSummaryThreshold(c.context_summary?.threshold || 20)
  }, [agent.id])

  const save = (patch: Record<string, any>) => {
    const current = agent.llm_config || {}
    onUpdate({
      llm_config: {
        ...current,
        context_window: {
          enabled: windowEnabled,
          size: windowSize,
          ...patch.context_window,
        },
        context_summary: {
          enabled: summaryEnabled,
          threshold: summaryThreshold,
          ...patch.context_summary,
        },
      },
    })
  }

  return (
    <div className="flex flex-col gap-5">
      <Section title="Context Management">
        <p className="text-[12px] leading-relaxed" style={{ color: 'var(--highlight)' }}>
          Configure how the agent manages conversation memory. Both options are independent.
        </p>

        <Toggle
          icon={FiLayers}
          label="Sliding window"
          description="Keeps only the last N messages. Older messages are removed from context."
          enabled={windowEnabled}
          onChange={(v) => { setWindowEnabled(v); save({ context_window: { enabled: v } }) }}
        />

        {windowEnabled && (
          <div className="flex flex-col gap-1.5 pl-14">
            <label className="text-[13px] font-medium" style={{ color: 'var(--text-muted)' }}>
              Window size
            </label>
            <p className="text-[12px]" style={{ color: 'var(--highlight)' }}>
              Number of conversation turns (user/assistant exchanges) kept. Associated tool calls are included automatically.
            </p>
            <div className="flex items-center gap-4">
              <input
                type="range" min="1" max="50" step="1" value={windowSize}
                onChange={(e) => { const v = parseInt(e.target.value); setWindowSize(v); save({ context_window: { enabled: true, size: v } }) }}
                className="flex-1 h-1.5 rounded-full appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, var(--primary) 0%, var(--primary) ${((windowSize - 1) / 49) * 100}%, var(--bg-light) ${((windowSize - 1) / 49) * 100}%, var(--bg-light) 100%)`,
                  border: 'none', padding: 0,
                }}
              />
              <span className="text-[13px] font-mono font-medium w-10 text-right" style={{ color: 'var(--primary)' }}>
                {windowSize}
              </span>
            </div>
          </div>
        )}

        <Toggle
          icon={FiFileText}
          label="Auto-summarization"
          description="When the conversation exceeds a threshold, older messages are summarized by an LLM and injected as memory."
          enabled={summaryEnabled}
          onChange={(v) => { setSummaryEnabled(v); save({ context_summary: { enabled: v } }) }}
        />

        {summaryEnabled && (
          <div className="flex flex-col gap-1.5 pl-14">
            <label className="text-[13px] font-medium" style={{ color: 'var(--text-muted)' }}>
              Trigger threshold
            </label>
            <p className="text-[12px]" style={{ color: 'var(--highlight)' }}>
              Number of turns before triggering summary compaction.
            </p>
            <div className="flex items-center gap-4">
              <input
                type="range" min="1" max="100" step="1" value={summaryThreshold}
                onChange={(e) => { const v = parseInt(e.target.value); setSummaryThreshold(v); save({ context_summary: { enabled: true, threshold: v } }) }}
                className="flex-1 h-1.5 rounded-full appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, var(--primary) 0%, var(--primary) ${((summaryThreshold - 1) / 99) * 100}%, var(--bg-light) ${((summaryThreshold - 1) / 99) * 100}%, var(--bg-light) 100%)`,
                  border: 'none', padding: 0,
                }}
              />
              <span className="text-[13px] font-mono font-medium w-10 text-right" style={{ color: 'var(--primary)' }}>
                {summaryThreshold}
              </span>
            </div>
          </div>
        )}

      </Section>
    </div>
  )
}
