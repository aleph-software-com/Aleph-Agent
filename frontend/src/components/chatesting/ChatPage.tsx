import { useState, useRef, useEffect, useCallback } from 'react'
import { RiRobot3Line } from 'react-icons/ri'
import { LuLayers } from 'react-icons/lu'
import ChatMessage from './ChatMessage'
import ChatInput from './ChatInput'
import DebugMessage from './DebugMessage'
import ContextSidebar from './ContextSidebar'
import type { HandoffData, TimelineItem, ContextMessage, Compaction, TokenUsage } from './types'
import * as api from '../../lib/api'

interface ChatPageProps {
  agentId?: string
  pipelineId?: string
  name: string
  onBack: () => void
}

// Build WebSocket URL from the API base
function getWsUrl(agentId?: string, pipelineId?: string): string {
  const base = (import.meta.env.VITE_API_URL || 'http://localhost:3001/api')
    .replace(/^http/, 'ws')
    .replace(/\/api$/, '')
  if (pipelineId) return `${base}/api/session/pipeline/${pipelineId}`
  return `${base}/api/session/${agentId}`
}

export default function ChatPage({ agentId, pipelineId, name, onBack }: ChatPageProps) {
  const [timeline, setTimeline] = useState<TimelineItem[]>([])
  const [loading, setLoading] = useState(false)
  const [contextMessages, setContextMessages] = useState<ContextMessage[]>([])
  const [contextTools, setContextTools] = useState<string[]>([])
  const [contextCompaction, setContextCompaction] = useState<Compaction | null>(null)
  const [handoffData, setHandoffData] = useState<HandoffData | null>(null)
  const [totalUsage, setTotalUsage] = useState({ prompt_tokens: 0, completion_tokens: 0 })
  const bottomRef = useRef<HTMLDivElement>(null)
  const pendingUsageRef = useRef<TokenUsage | null>(null)
  const sessionIdRef = useRef<string | null>(null)

  // Voice state
  const [sttEnabled, setSttEnabled] = useState(false)
  const [voiceActive, setVoiceActive] = useState(false)
  const [voiceTranscript, setVoiceTranscript] = useState('')

  // Single WebSocket connection
  const wsRef = useRef<WebSocket | null>(null)
  const wsReadyRef = useRef(false)

  // TTS audio playback
  const [ttsEnabled, setTtsEnabled] = useState(false)
  const audioQueueRef = useRef<Blob[]>([])
  const audioPlayingRef = useRef(false)

  // Audio capture refs
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const workletRef = useRef<AudioWorkletNode | null>(null)

  const isPipeline = !!pipelineId

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [timeline, loading])

  // ────────────────────────────────────────
  // Event handler — all events from the server
  // ────────────────────────────────────────

  const handleEvent = useCallback((type: string, data: any) => {
    switch (type) {
      case 'session':
        sessionIdRef.current = data.id
        // Check if STT is available (server will emit speech events if so)
        break

      case 'token':
        setTimeline((prev) => {
          const last = prev[prev.length - 1]
          if (last?.kind === 'message' && last.message?.role === 'assistant' && !last.message.usage) {
            const updated = [...prev]
            updated[updated.length - 1] = {
              ...last,
              message: { ...last.message!, content: last.message!.content + data.t },
            }
            return updated
          }
          return [...prev, { kind: 'message', message: { role: 'assistant', content: data.t } }]
        })
        break

      case 'debug': {
        const entry = data.data || data
        if (entry.type !== 'handoff') {
          setTimeline((prev) => [...prev, { kind: 'debug', debug: entry }])
        }
        break
      }

      case 'context':
        setContextMessages(data.messages || [])
        setContextTools(data.tools || [])
        if (data.compaction) setContextCompaction(data.compaction)
        if (data.handoff) setHandoffData(data.handoff)
        break

      case 'handoff':
        setHandoffData(data)
        if (data.transfer_message) {
          setTimeline((prev) => [
            ...prev,
            { kind: 'message', message: { role: 'assistant', content: data.transfer_message } },
          ])
        }
        break

      case 'usage': {
        const prev = pendingUsageRef.current
        pendingUsageRef.current = {
          prompt_tokens: (prev?.prompt_tokens ?? 0) + (data.prompt_tokens || 0),
          completion_tokens: (prev?.completion_tokens ?? 0) + (data.completion_tokens || 0),
          total_prompt_tokens: 0,
          total_completion_tokens: 0,
        }
        setTotalUsage((t) => ({
          prompt_tokens: t.prompt_tokens + (data.prompt_tokens || 0),
          completion_tokens: t.completion_tokens + (data.completion_tokens || 0),
        }))
        break
      }

      case 'done': {
        const usage = pendingUsageRef.current ?? undefined
        pendingUsageRef.current = null
        if (usage) {
          setTimeline((prev) => {
            const last = prev[prev.length - 1]
            if (last?.kind === 'message' && last.message?.role === 'assistant') {
              const updated = [...prev]
              updated[updated.length - 1] = {
                ...last,
                message: { ...last.message!, usage },
              }
              return updated
            }
            return prev
          })
        }
        setLoading(false)
        break
      }

      case 'error':
        setTimeline((prev) => [
          ...prev,
          { kind: 'debug', debug: { type: 'info', content: `Error: ${data.error}`, timestamp: new Date().toISOString() } },
        ])
        break

      // STT events
      case 'speech_start':
        setSttEnabled(true)
        setVoiceTranscript('')
        setLoading(false)
        // Barge-in: stop TTS playback
        stopAudioPlayback()
        if (pendingUsageRef.current) {
          const usage = pendingUsageRef.current
          pendingUsageRef.current = null
          setTimeline((prev) => {
            const last = prev[prev.length - 1]
            if (last?.kind === 'message' && last.message?.role === 'assistant' && !last.message.usage) {
              const updated = [...prev]
              updated[updated.length - 1] = {
                ...last,
                message: { ...last.message!, usage },
              }
              return updated
            }
            return prev
          })
        }
        break
      case 'speech_end':
        break
      case 'transcript_final':
        setVoiceTranscript(data.text || '')
        break
      case 'utterance':
        if (data.text) {
          setTimeline((prev) => [
            ...prev,
            { kind: 'message', message: { role: 'user', content: data.text } },
          ])
          setVoiceTranscript('')
        }
        setLoading(true)
        break
    }
  }, [])

  // ────────────────────────────────────────
  // TTS audio playback — queue + sequential play
  // ────────────────────────────────────────

  const currentAudioRef = useRef<HTMLAudioElement | null>(null)

  const playNext = useCallback(() => {
    if (audioPlayingRef.current) return
    const next = audioQueueRef.current.shift()
    if (!next) return

    audioPlayingRef.current = true
    const url = URL.createObjectURL(next)
    const audio = new Audio(url)
    currentAudioRef.current = audio

    audio.onended = () => {
      URL.revokeObjectURL(url)
      audioPlayingRef.current = false
      currentAudioRef.current = null
      playNext() // play next chunk in queue
    }
    audio.onerror = () => {
      URL.revokeObjectURL(url)
      audioPlayingRef.current = false
      currentAudioRef.current = null
      playNext()
    }
    audio.play().catch(() => {
      audioPlayingRef.current = false
      currentAudioRef.current = null
    })
  }, [])

  const queueAudioChunk = useCallback((blob: Blob) => {
    setTtsEnabled(true)
    audioQueueRef.current.push(blob)
    playNext()
  }, [playNext])

  const stopAudioPlayback = useCallback(() => {
    audioQueueRef.current = []
    if (currentAudioRef.current) {
      currentAudioRef.current.pause()
      currentAudioRef.current = null
    }
    audioPlayingRef.current = false
  }, [])

  // ────────────────────────────────────────
  // WebSocket connection — single, for everything
  // ────────────────────────────────────────

  const connectWs = useCallback(() => {
    if (wsRef.current) return

    const url = getWsUrl(agentId, pipelineId)
    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.binaryType = 'arraybuffer'

    ws.onopen = () => {
      wsReadyRef.current = true
      setLoading(true)
    }

    ws.onmessage = (event) => {
      if (event.data instanceof ArrayBuffer) {
        // Binary = TTS audio chunk (MP3)
        queueAudioChunk(new Blob([event.data], { type: 'audio/mpeg' }))
        return
      }
      try {
        const msg = JSON.parse(event.data)
        handleEvent(msg.type, msg)
      } catch { /* ignore */ }
    }

    ws.onclose = () => {
      wsReadyRef.current = false
      wsRef.current = null
      cleanupAudio()
      setVoiceActive(false)
      setVoiceTranscript('')
    }

    ws.onerror = () => {
      handleEvent('error', { error: 'WebSocket connection failed' })
    }
  }, [agentId, pipelineId, handleEvent])

  // Connect on mount
  useEffect(() => {
    connectWs()
    return () => {
      wsRef.current?.close()
      wsRef.current = null
      cleanupAudio()
    }
  }, [connectWs])

  // Check if agent has STT enabled
  useEffect(() => {
    if (!agentId) return
    api.agents.getFull(agentId).then((agent: any) => {
      setSttEnabled(!!agent.stt_provider)
    }).catch(() => {})
  }, [agentId])

  // ────────────────────────────────────────
  // Send text message
  // ────────────────────────────────────────

  const handleSend = (text: string) => {
    setTimeline((prev) => [...prev, { kind: 'message', message: { role: 'user', content: text } }])
    setLoading(true)

    if (wsRef.current && wsReadyRef.current) {
      wsRef.current.send(JSON.stringify({ type: 'message', text }))
    }
  }

  // ────────────────────────────────────────
  // Voice toggle — mic capture on same WebSocket
  // ────────────────────────────────────────

  const startVoice = async () => {
    if (!wsRef.current || !wsReadyRef.current) return

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
      })
      mediaStreamRef.current = stream

      const audioContext = new AudioContext()
      audioContextRef.current = audioContext

      // Tell server the sample rate
      wsRef.current.send(JSON.stringify({ type: 'audio_config', sampleRate: audioContext.sampleRate }))

      await audioContext.audioWorklet.addModule('/audio-capture-processor.js')

      const source = audioContext.createMediaStreamSource(stream)
      const worklet = new AudioWorkletNode(audioContext, 'audio-capture-processor')
      workletRef.current = worklet

      const ws = wsRef.current
      worklet.port.onmessage = (e) => {
        if (ws.readyState === WebSocket.OPEN) ws.send(e.data)
      }

      source.connect(worklet)
      setVoiceActive(true)
    } catch (err: any) {
      handleEvent('error', { error: `Mic access denied: ${err.message}` })
    }
  }

  const stopVoice = () => {
    cleanupAudio()
    setVoiceActive(false)
    setVoiceTranscript('')
  }

  const cleanupAudio = () => {
    if (workletRef.current) { workletRef.current.disconnect(); workletRef.current = null }
    if (audioContextRef.current) { audioContextRef.current.close(); audioContextRef.current = null }
    if (mediaStreamRef.current) { mediaStreamRef.current.getTracks().forEach((t) => t.stop()); mediaStreamRef.current = null }
  }

  const handleVoiceToggle = () => {
    if (voiceActive) stopVoice()
    else startVoice()
  }

  const handleReset = () => {
    // Close current connection and reconnect
    if (voiceActive) stopVoice()
    wsRef.current?.close()
    wsRef.current = null
    wsReadyRef.current = false
    sessionIdRef.current = null
    setTimeline([])
    setContextMessages([])
    setContextTools([])
    setContextCompaction(null)
    setHandoffData(null)
    setTotalUsage({ prompt_tokens: 0, completion_tokens: 0 })
    // Reconnect
    setTimeout(connectWs, 100)
  }

  // ────────────────────────────────────────
  // Render
  // ────────────────────────────────────────

  const Icon = isPipeline ? LuLayers : RiRobot3Line

  return (
    <div
      className="fixed inset-0 z-50 flex"
      style={{ background: 'var(--bg-dark)' }}
    >
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto py-8 flex flex-col gap-5">
            {timeline.length === 0 && !loading && (
              <div className="flex flex-col items-center justify-center pt-32 gap-4">
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center"
                  style={{ background: 'var(--primary-hover)', border: '1px solid var(--border)' }}
                >
                  <Icon size={22} style={{ color: isPipeline ? 'var(--info)' : 'var(--primary)' }} />
                </div>
                <div className="text-center">
                  <h3 className="text-[16px] font-semibold mb-1" style={{ color: 'var(--text)' }}>
                    {name}
                  </h3>
                  <p className="text-[13px]" style={{ color: 'var(--highlight)' }}>
                    Send a message to start the conversation.
                  </p>
                </div>
              </div>
            )}

            {timeline.map((item, i) =>
              item.kind === 'message' && item.message ? (
                <ChatMessage key={i} role={item.message.role} content={item.message.content} usage={item.message.usage} />
              ) : item.kind === 'debug' && item.debug ? (
                <DebugMessage key={i} entry={item.debug} />
              ) : null
            )}

            {loading && !timeline.some((item) => item.kind === 'message' && item.message?.role === 'assistant' && !item.message.usage) && (
              <div className="flex gap-3 px-4">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: 'var(--primary-hover)', border: '1px solid var(--border)' }}
                >
                  <RiRobot3Line size={14} style={{ color: 'var(--primary)' }} />
                </div>
                <div className="flex gap-1 items-center pt-2">
                  <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: 'var(--text-muted)', animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: 'var(--text-muted)', animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: 'var(--text-muted)', animationDelay: '300ms' }} />
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>
        </div>

        <ChatInput
          onSend={handleSend}
          disabled={!!handoffData}
          sttEnabled={sttEnabled}
          voiceActive={voiceActive}
          onVoiceToggle={handleVoiceToggle}
          voiceTranscript={voiceTranscript}
        />
      </div>

      <div className="w-[50%] shrink-0">
        <ContextSidebar
          name={name}
          isPipeline={isPipeline}
          onBack={() => {
            if (voiceActive) stopVoice()
            wsRef.current?.close()
            if (sessionIdRef.current) api.sessions.remove(sessionIdRef.current).catch(() => {})
            onBack()
          }}
          onReset={handleReset}
          messages={contextMessages}
          tools={contextTools}
          compaction={contextCompaction}
          handoff={handoffData}
          totalUsage={totalUsage}
        />
      </div>
    </div>
  )
}
