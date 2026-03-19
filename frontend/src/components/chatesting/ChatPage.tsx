import { useState, useRef, useEffect, useCallback } from 'react'
import { FiArrowLeft } from 'react-icons/fi'
import { RiRobot3Line } from 'react-icons/ri'
import { LuLayers } from 'react-icons/lu'
import ChatMessage from './ChatMessage'
import ChatInput from './ChatInput'
import DebugMessage from './DebugMessage'
import ContextSidebar from './ContextSidebar'
import type { Message, HandoffData, TimelineItem, ContextMessage, Compaction, ConditionEval, TokenUsage } from './types'
import * as api from '../../lib/api'

interface ChatPageProps {
  agentId?: string
  pipelineId?: string
  name: string
  onBack: () => void
}

export default function ChatPage({ agentId, pipelineId, name, onBack }: ChatPageProps) {
  const [timeline, setTimeline] = useState<TimelineItem[]>([])
  const [loading, setLoading] = useState(false)
  const [streamingText, setStreamingText] = useState('')
  const [contextMessages, setContextMessages] = useState<ContextMessage[]>([])
  const [contextTools, setContextTools] = useState<string[]>([])
  const [contextCompaction, setContextCompaction] = useState<Compaction | null>(null)
  const [contextConditions, setContextConditions] = useState<ConditionEval[]>([])
  const [handoffData, setHandoffData] = useState<HandoffData | null>(null)
  const [totalUsage, setTotalUsage] = useState({ prompt_tokens: 0, completion_tokens: 0 })
  const bottomRef = useRef<HTMLDivElement>(null)
  const greetedRef = useRef(false)
  const sessionIdRef = useRef<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const pendingUsageRef = useRef<TokenUsage | null>(null)

  const isPipeline = !!pipelineId

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [timeline, loading, streamingText])

  const streamChat = useCallback(async (history?: { role: string; content: string }[]) => {
    // Abort any in-flight stream
    if (abortRef.current) {
      abortRef.current.abort()
      abortRef.current = null
    }

    const controller = new AbortController()
    abortRef.current = controller

    setLoading(true)
    setStreamingText('')
    setHandoffData(null)

    let accumulated = ''

    const handleEvent = (event: string, data: any) => {
      switch (event) {
        case 'session':
          sessionIdRef.current = data.id
          break
        case 'token':
          accumulated += data.t
          setStreamingText(accumulated)
          break
        case 'flush':
          // Pipeline: flush current streaming text as a complete message
          if (accumulated) {
            const flushedText = accumulated
            const flushedUsage = pendingUsageRef.current ?? undefined
            pendingUsageRef.current = null
            setTimeline((prev) => [
              ...prev,
              { kind: 'message', message: { role: 'assistant', content: flushedText, usage: flushedUsage } },
            ])
            accumulated = ''
            setStreamingText('')
          }
          break
        case 'transfer':
          // Pipeline: transfer message from handoff
          if (data.content) {
            setTimeline((prev) => [
              ...prev,
              { kind: 'message', message: { role: 'assistant', content: data.content } },
            ])
          }
          break
        case 'debug':
          if (data.type !== 'handoff') {
            setTimeline((prev) => [...prev, { kind: 'debug', debug: data }])
          }
          if (data.type === 'condition_eval') {
            setContextConditions((prev) => [...prev, data])
          }
          break
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
          // Accumulate per-message usage (all iterations including tool calls)
          const prev = pendingUsageRef.current
          pendingUsageRef.current = {
            prompt_tokens: (prev?.prompt_tokens ?? 0) + data.prompt_tokens,
            completion_tokens: (prev?.completion_tokens ?? 0) + data.completion_tokens,
            total_prompt_tokens: 0,
            total_completion_tokens: 0,
          }
          // Accumulate session total across all runAgentLoop calls
          setTotalUsage((t) => ({
            prompt_tokens: t.prompt_tokens + data.prompt_tokens,
            completion_tokens: t.completion_tokens + data.completion_tokens,
          }))
          break
        }
        case 'error':
          setTimeline((prev) => [
            ...prev,
            { kind: 'debug', debug: { type: 'info', content: `Error: ${data.error}`, timestamp: new Date().toISOString() } },
          ])
          break
        case 'done':
          break
      }
    }

    try {
      if (isPipeline) {
        await api.pipelineChat.stream(pipelineId!, history || null, sessionIdRef.current, handleEvent, controller.signal)
      } else {
        await api.chat.stream(agentId!, history || null, sessionIdRef.current, handleEvent, controller.signal)
      }

      if (accumulated) {
        const finalUsage = pendingUsageRef.current ?? undefined
        pendingUsageRef.current = null
        setTimeline((prev) => [
          ...prev,
          { kind: 'message', message: { role: 'assistant', content: accumulated, usage: finalUsage } },
        ])
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        // Interruption — save partial text if any
        if (accumulated) {
          setTimeline((prev) => [
            ...prev,
            { kind: 'message', message: { role: 'assistant', content: accumulated + ' …' } },
          ])
        }
        return
      }
      setTimeline((prev) => [
        ...prev,
        {
          kind: 'debug',
          debug: {
            type: 'info',
            content: `Error: ${err.message || "Unable to reach the agent"}`,
            timestamp: new Date().toISOString(),
          },
        },
      ])
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null
      }
      setStreamingText('')
      setLoading(false)
    }
  }, [agentId, pipelineId, isPipeline])

  useEffect(() => {
    if (greetedRef.current) return
    greetedRef.current = true
    streamChat()
  }, [streamChat])

  const handleSend = async (text: string) => {
    const userMsg: Message = { role: 'user', content: text }
    setTimeline((prev) => [...prev, { kind: 'message', message: userMsg }])

    const history: { role: string; content: string }[] = timeline
      .filter((item) => item.kind === 'message' && item.message)
      .map((item) => ({ role: item.message!.role, content: item.message!.content }))
    history.push({ role: 'user', content: text })

    await streamChat(history)
  }

  const handleReset = () => {
    if (sessionIdRef.current) api.sessions.remove(sessionIdRef.current).catch(() => {})
    sessionIdRef.current = null
    setTimeline([])
    setStreamingText('')
    setContextMessages([])
    setContextTools([])
    setContextCompaction(null)
    setContextConditions([])
    setHandoffData(null)
    setTotalUsage({ prompt_tokens: 0, completion_tokens: 0 })
    streamChat()
  }

  const Icon = isPipeline ? LuLayers : RiRobot3Line

  return (
    <div
      className="fixed inset-0 z-50 flex"
      style={{ background: 'var(--bg-dark)' }}
    >
      {/* Chat area — no header */}
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

            {streamingText && (
              <ChatMessage role="assistant" content={streamingText} />
            )}

            {loading && !streamingText && (
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

        <ChatInput onSend={handleSend} disabled={!!handoffData} />
      </div>

      {/* Context sidebar — always visible */}
      <div className="w-[50%] shrink-0">
        <ContextSidebar
          name={name}
          isPipeline={isPipeline}
          onBack={() => {
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
