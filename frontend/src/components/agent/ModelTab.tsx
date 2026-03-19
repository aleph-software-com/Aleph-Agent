import { useState, useEffect } from 'react'
import { FiPlay, FiVolume2 } from 'react-icons/fi'
import Dropdown from '../ui/Dropdown'
import Section from '../ui/Section'
import ProviderKeySelector from './ProviderKeySelector'

function Field({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[13px] font-medium" style={{ color: 'var(--text-muted)' }}>{label}</label>
      {description && <p className="text-[12px]" style={{ color: 'var(--highlight)' }}>{description}</p>}
      {children}
    </div>
  )
}

function VoiceOption({ name, language, selected, onSelect }: {
  name: string; language: string; selected: boolean; onSelect: () => void
}) {
  return (
    <div
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelect() }}
      className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 cursor-pointer w-full text-left"
      style={{
        background: selected ? 'var(--primary-hover)' : 'var(--bg-light)',
        border: `1px solid ${selected ? 'var(--border)' : 'var(--border-muted)'}`,
      }}
      onMouseEnter={(e) => { if (!selected) e.currentTarget.style.borderColor = 'var(--border)' }}
      onMouseLeave={(e) => { if (!selected) e.currentTarget.style.borderColor = 'var(--border-muted)' }}
    >
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
        style={{
          background: selected ? 'var(--primary)' : 'var(--bg-light)',
          color: selected ? 'var(--bg-dark)' : 'var(--highlight)',
        }}
      >
        <FiVolume2 size={14} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-medium" style={{ color: selected ? 'var(--text)' : 'var(--text-muted)' }}>
          {name}
        </div>
        <div className="text-[11px]" style={{ color: 'var(--highlight)' }}>{language}</div>
      </div>
      <button
        className="w-7 h-7 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer shrink-0"
        style={{ background: 'var(--bg-light)', border: '1px solid var(--border-muted)', color: 'var(--highlight)' }}
        onClick={(e) => e.stopPropagation()}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.color = 'var(--primary)' }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-muted)'; e.currentTarget.style.color = 'var(--highlight)' }}
      >
        <FiPlay size={11} />
      </button>
    </div>
  )
}

const voices = [
  { id: 'alloy', name: 'Alloy', language: 'Neutral — Versatile' },
  { id: 'echo', name: 'Echo', language: 'Male — Conversational' },
  { id: 'fable', name: 'Fable', language: 'Neutral — Expressive' },
  { id: 'onyx', name: 'Onyx', language: 'Male — Deep' },
  { id: 'nova', name: 'Nova', language: 'Female — Natural' },
  { id: 'shimmer', name: 'Shimmer', language: 'Female — Clear' },
]

const llmModelOptions = [
  { value: 'gpt-4o', label: 'GPT-4o' },
  { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
  { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
  { value: 'o1', label: 'o1' },
  { value: 'o1-mini', label: 'o1-mini' },
  { value: 'o3-mini', label: 'o3-mini' },
]

const ttsModelOptions = [
  { value: 'tts-1', label: 'TTS-1' },
  { value: 'tts-1-hd', label: 'TTS-1 HD' },
]

const sttModelOptions = [
  { value: 'whisper-1', label: 'Whisper-1' },
]

const sttLangOptions = [
  { value: 'multi', label: 'Multilingual' },
  { value: 'fr', label: 'French' },
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Español' },
]

interface ModelTabProps {
  agent: any
  onUpdate: (data: any) => void
}

export default function ModelTab({ agent, onUpdate }: ModelTabProps) {
  const cfg = agent.llm_config || {}
  const ttsCfg = agent.tts_config || {}
  const sttCfg = agent.stt_config || {}

  const [model, setModel] = useState(cfg.model || 'gpt-4o')
  const [temperature, setTemperature] = useState(cfg.temperature ?? 0.7)
  const [apiKeyHint, setApiKeyHint] = useState<string | null>(cfg.api_key_hint || null)

  const [ttsModel, setTtsModel] = useState(ttsCfg.model || 'tts-1')
  const [selectedVoice, setSelectedVoice] = useState(ttsCfg.voice || 'alloy')
  const [speed, setSpeed] = useState(ttsCfg.speed ?? 1.0)

  const [sttModel, setSttModel] = useState(sttCfg.model || 'whisper-1')
  const [sttLang, setSttLang] = useState(sttCfg.language || 'multi')

  useEffect(() => {
    const c = agent.llm_config || {}
    const t = agent.tts_config || {}
    const s = agent.stt_config || {}
    setModel(c.model || 'gpt-4o')
    setTemperature(c.temperature ?? 0.7)
    setApiKeyHint(c.api_key_hint || null)
    setTtsModel(t.model || 'tts-1')
    setSelectedVoice(t.voice || 'alloy')
    setSpeed(t.speed ?? 1.0)
    setSttModel(s.model || 'whisper-1')
    setSttLang(s.language || 'multi')
  }, [agent.id])

  const saveLlm = (patch: Record<string, unknown>) => {
    const updated = { provider: 'openai', model, temperature, ...patch }
    onUpdate({
      llm_config: updated,
      llm_provider: 'openai',
      llm_model: (patch.model as string) || model,
    })
  }

  const saveTts = (patch: Record<string, unknown>) => {
    const updated = { provider: 'openai', model: ttsModel, voice: selectedVoice, speed, ...patch }
    onUpdate({
      tts_config: updated,
      tts_provider: 'openai',
      tts_model: (patch.model as string) || ttsModel,
    })
  }

  const saveStt = (patch: Record<string, unknown>) => {
    const updated = { provider: 'openai', model: sttModel, language: sttLang, ...patch }
    onUpdate({
      stt_config: updated,
      stt_provider: 'openai',
      stt_model: (patch.model as string) || sttModel,
    })
  }

  return (
    <div className="flex flex-col gap-5">
      {/* LLM */}
      <Section
        title="Model LLM"
        action={
          <ProviderKeySelector
            hint={apiKeyHint}
            onSave={(encrypted, hint) => {
              setApiKeyHint(hint)
              saveLlm({ api_key_encrypted: encrypted, api_key_hint: hint })
            }}
            onRemove={() => {
              setApiKeyHint(null)
              saveLlm({ api_key_encrypted: null, api_key_hint: null })
            }}
          />
        }
      >
        <Field label="Model">
          <Dropdown
            options={llmModelOptions}
            value={model}
            onChange={(v) => { setModel(v); saveLlm({ model: v }) }}
          />
        </Field>
        <Field label="Temperature" description="Controls response creativity. Lower = more deterministic.">
          <div className="flex items-center gap-4">
            <input
              type="range" min="0" max="2" step="0.1" value={temperature}
              onChange={(e) => { const v = parseFloat(e.target.value); setTemperature(v); saveLlm({ temperature: v }) }}
              className="flex-1 h-1.5 rounded-full appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, var(--primary) 0%, var(--primary) ${(temperature / 2) * 100}%, var(--bg-light) ${(temperature / 2) * 100}%, var(--bg-light) 100%)`,
                border: 'none', padding: 0,
              }}
            />
            <span className="text-[13px] font-mono font-medium w-10 text-right" style={{ color: 'var(--primary)' }}>
              {temperature.toFixed(1)}
            </span>
          </div>
        </Field>
      </Section>

      {/* TTS */}
      <Section
        title="Model Text-to-Speech"
        action={
          <span className="text-[11px] font-medium tracking-wide uppercase px-2.5 py-1 rounded-full" style={{ background: 'var(--bg-light)', color: 'var(--highlight)', border: '1px solid var(--border-muted)' }}>
            Coming Soon
          </span>
        }
      >
        <div style={{ opacity: 0.4, pointerEvents: 'none', userSelect: 'none' }}>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Model">
              <Dropdown
                options={ttsModelOptions}
                value={ttsModel}
                onChange={() => {}}
              />
            </Field>
            <Field label="Speed">
              <div className="flex items-center gap-3">
                <input
                  type="range" min="0.5" max="2" step="0.1" value={speed}
                  readOnly
                  className="flex-1 h-1.5 rounded-full appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, var(--primary) 0%, var(--primary) ${((speed - 0.5) / 1.5) * 100}%, var(--bg-light) ${((speed - 0.5) / 1.5) * 100}%, var(--bg-light) 100%)`,
                    border: 'none', padding: 0,
                  }}
                />
                <span className="text-[13px] font-mono font-medium w-10 text-right" style={{ color: 'var(--primary)' }}>
                  {speed.toFixed(1)}x
                </span>
              </div>
            </Field>
          </div>
          <div className="flex flex-col gap-1.5 mt-5">
            <label className="text-[13px] font-medium" style={{ color: 'var(--text-muted)' }}>Voice</label>
            <div className="grid grid-cols-2 gap-2">
              {voices.map((voice) => (
                <VoiceOption
                  key={voice.id} name={voice.name} language={voice.language}
                  selected={selectedVoice === voice.id}
                  onSelect={() => {}}
                />
              ))}
            </div>
          </div>
        </div>
      </Section>

      {/* STT */}
      <Section
        title="Model Speech-to-Text"
        action={
          <span className="text-[11px] font-medium tracking-wide uppercase px-2.5 py-1 rounded-full" style={{ background: 'var(--bg-light)', color: 'var(--highlight)', border: '1px solid var(--border-muted)' }}>
            Coming Soon
          </span>
        }
      >
        <div style={{ opacity: 0.4, pointerEvents: 'none', userSelect: 'none' }}>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Model">
              <Dropdown
                options={sttModelOptions}
                value={sttModel}
                onChange={() => {}}
              />
            </Field>
            <Field label="Language">
              <Dropdown
                options={sttLangOptions}
                value={sttLang}
                onChange={() => {}}
              />
            </Field>
          </div>
        </div>
      </Section>
    </div>
  )
}
