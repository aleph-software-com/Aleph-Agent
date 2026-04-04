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

const llmModelOptions = [
  { value: 'gpt-4o', label: 'GPT-4o' },
  { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
  { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
  { value: 'o1', label: 'o1' },
  { value: 'o1-mini', label: 'o1-mini' },
  { value: 'o3-mini', label: 'o3-mini' },
]

const ttsModelOptions = [
  { value: 'eleven_multilingual_v2', label: 'Multilingual v2', description: 'Best quality — 29 languages' },
  { value: 'eleven_turbo_v2_5', label: 'Turbo v2.5', description: 'Low latency — 32 languages' },
  { value: 'eleven_flash_v2_5', label: 'Flash v2.5', description: 'Fastest — real-time' },
]

const ttsVoices = [
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah', language: 'Female — Conversational' },
  { id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel', language: 'Female — Calm' },
  { id: 'pNInz6obpgDQGcFmaJgB', name: 'Adam', language: 'Male — Deep' },
  { id: 'ErXwobaYiN019PkySvjV', name: 'Antoni', language: 'Male — Conversational' },
  { id: 'MF3mGyEYCl7XYWbV9V6O', name: 'Elli', language: 'Female — Clear' },
  { id: 'TxGEqnHWrfWFTfGW9XjX', name: 'Josh', language: 'Male — Narrative' },
]

const sttModelOptions = [
  { value: 'nova-3', label: 'Nova-3', description: 'Latest — best accuracy' },
  { value: 'nova-2', label: 'Nova-2', description: 'Stable — low latency' },
]

const sttLangOptions = [
  { value: 'multi', label: 'Multilingual' },
  { value: 'fr', label: 'French' },
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Español' },
  { value: 'de', label: 'Deutsch' },
  { value: 'pt', label: 'Portuguese' },
  { value: 'it', label: 'Italian' },
  { value: 'ar', label: 'Arabic' },
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

  const [ttsEnabled, setTtsEnabled] = useState(!!agent.tts_provider)
  const [ttsModel, setTtsModel] = useState(ttsCfg.model_id || 'eleven_multilingual_v2')
  const [selectedVoice, setSelectedVoice] = useState(ttsCfg.voice_id || 'EXAVITQu4vr4xnSDxMaL')
  const [ttsKeyHint, setTtsKeyHint] = useState<string | null>(ttsCfg.api_key_hint || null)

  const [sttEnabled, setSttEnabled] = useState(!!agent.stt_provider)
  const [sttModel, setSttModel] = useState(sttCfg.model || 'nova-2')
  const [sttLang, setSttLang] = useState(sttCfg.language || 'multi')
  const [sttKeyHint, setSttKeyHint] = useState<string | null>(sttCfg.api_key_hint || null)

  useEffect(() => {
    const c = agent.llm_config || {}
    const t = agent.tts_config || {}
    const s = agent.stt_config || {}
    setModel(c.model || 'gpt-4o')
    setTemperature(c.temperature ?? 0.7)
    setApiKeyHint(c.api_key_hint || null)
    setTtsEnabled(!!agent.tts_provider)
    setTtsModel(t.model_id || 'eleven_multilingual_v2')
    setSelectedVoice(t.voice_id || 'EXAVITQu4vr4xnSDxMaL')
    setTtsKeyHint(t.api_key_hint || null)
    setSttEnabled(!!agent.stt_provider)
    setSttModel(s.model || 'nova-2')
    setSttLang(s.language || 'multi')
    setSttKeyHint(s.api_key_hint || null)
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
    const updated = { provider: 'elevenlabs', model_id: ttsModel, voice_id: selectedVoice, ...patch }
    onUpdate({
      tts_config: updated,
      tts_provider: 'elevenlabs',
      tts_model: (patch.voice_id as string) || selectedVoice,
    })
  }

  const disableTts = () => {
    onUpdate({
      tts_config: {},
      tts_provider: null,
      tts_model: null,
    })
  }

  const saveStt = (patch: Record<string, unknown>) => {
    const updated = { provider: 'deepgram', model: sttModel, language: sttLang, ...patch }
    onUpdate({
      stt_config: updated,
      stt_provider: 'deepgram',
      stt_model: (patch.model as string) || sttModel,
    })
  }

  const disableStt = () => {
    onUpdate({
      stt_config: {},
      stt_provider: null,
      stt_model: null,
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
        title="Text-to-Speech"
        action={
          <div className="flex items-center gap-2">
            {ttsEnabled && (
              <ProviderKeySelector
                hint={ttsKeyHint}
                onSave={(encrypted, hint) => {
                  setTtsKeyHint(hint)
                  saveTts({ api_key_encrypted: encrypted, api_key_hint: hint })
                }}
                onRemove={() => {
                  setTtsKeyHint(null)
                  saveTts({ api_key_encrypted: null, api_key_hint: null })
                }}
              />
            )}
            <button
              type="button"
              onClick={() => {
                const next = !ttsEnabled
                setTtsEnabled(next)
                if (next) saveTts({})
                else disableTts()
              }}
              className="relative w-9 h-5 rounded-full transition-all duration-200 cursor-pointer"
              style={{
                background: ttsEnabled ? 'var(--primary)' : 'var(--bg-light)',
                border: `1px solid ${ttsEnabled ? 'var(--primary)' : 'var(--border-muted)'}`,
              }}
            >
              <div
                className="absolute top-0.5 w-3.5 h-3.5 rounded-full transition-all duration-200"
                style={{
                  background: ttsEnabled ? 'var(--bg-dark)' : 'var(--highlight)',
                  left: ttsEnabled ? 18 : 3,
                }}
              />
            </button>
          </div>
        }
      >
        {ttsEnabled ? (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: 'var(--bg-light)', border: '1px solid var(--border-muted)' }}>
              <span className="text-[12px] font-medium" style={{ color: 'var(--highlight)' }}>Provider</span>
              <span className="text-[12px] font-semibold" style={{ color: 'var(--text)' }}>ElevenLabs</span>
            </div>
            <Field label="Model">
              <Dropdown
                options={ttsModelOptions}
                value={ttsModel}
                onChange={(v) => { setTtsModel(v); saveTts({ model_id: v }) }}
              />
            </Field>
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-medium" style={{ color: 'var(--text-muted)' }}>Voice</label>
              <div className="grid grid-cols-2 gap-2">
                {ttsVoices.map((voice) => (
                  <VoiceOption
                    key={voice.id} name={voice.name} language={voice.language}
                    selected={selectedVoice === voice.id}
                    onSelect={() => { setSelectedVoice(voice.id); saveTts({ voice_id: voice.id }) }}
                  />
                ))}
              </div>
            </div>
          </div>
        ) : (
          <p className="text-[12px] py-2" style={{ color: 'var(--highlight)' }}>
            Enable to add voice output to this agent. Uses ElevenLabs for speech synthesis.
          </p>
        )}
      </Section>

      {/* STT */}
      <Section
        title="Speech-to-Text"
        action={
          <div className="flex items-center gap-2">
            {sttEnabled && (
              <ProviderKeySelector
                hint={sttKeyHint}
                onSave={(encrypted, hint) => {
                  setSttKeyHint(hint)
                  saveStt({ api_key_encrypted: encrypted, api_key_hint: hint })
                }}
                onRemove={() => {
                  setSttKeyHint(null)
                  saveStt({ api_key_encrypted: null, api_key_hint: null })
                }}
              />
            )}
            <button
              type="button"
              onClick={() => {
                const next = !sttEnabled
                setSttEnabled(next)
                if (next) saveStt({})
                else disableStt()
              }}
              className="relative w-9 h-5 rounded-full transition-all duration-200 cursor-pointer"
              style={{
                background: sttEnabled ? 'var(--primary)' : 'var(--bg-light)',
                border: `1px solid ${sttEnabled ? 'var(--primary)' : 'var(--border-muted)'}`,
              }}
            >
              <div
                className="absolute top-0.5 w-3.5 h-3.5 rounded-full transition-all duration-200"
                style={{
                  background: sttEnabled ? 'var(--bg-dark)' : 'var(--highlight)',
                  left: sttEnabled ? 18 : 3,
                }}
              />
            </button>
          </div>
        }
      >
        {sttEnabled ? (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: 'var(--bg-light)', border: '1px solid var(--border-muted)' }}>
              <span className="text-[12px] font-medium" style={{ color: 'var(--highlight)' }}>Provider</span>
              <span className="text-[12px] font-semibold" style={{ color: 'var(--text)' }}>Deepgram</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Model">
                <Dropdown
                  options={sttModelOptions}
                  value={sttModel}
                  onChange={(v) => { setSttModel(v); saveStt({ model: v }) }}
                />
              </Field>
              <Field label="Language">
                <Dropdown
                  options={sttLangOptions}
                  value={sttLang}
                  onChange={(v) => { setSttLang(v); saveStt({ language: v }) }}
                />
              </Field>
            </div>
          </div>
        ) : (
          <p className="text-[12px] py-2" style={{ color: 'var(--highlight)' }}>
            Enable to add voice input to this agent. Uses Deepgram for transcription and Silero VAD for turn detection.
          </p>
        )}
      </Section>
    </div>
  )
}
