export interface ContextMessage {
  role: string
  content?: string | null
  name?: string
  temperature?: number
  tool_calls?: any[]
  tool_call_id?: string
}

export interface Compaction {
  description: string
  before_count: number
  after_count: number
  summary_generated: boolean
  before: any[]
  after: any[]
  summary: string | null
}

export interface ConditionEval {
  label: string
  variable: string
  operator: string
  value: string
  actual: string
  result: boolean
}

export interface HandoffData {
  tool_name: string
  target_type: string
  transfer_message: string
  context_options: string[]
  reason: string
  previous_messages?: ContextMessage[]
}

export interface TokenUsage {
  prompt_tokens: number
  completion_tokens: number
  total_prompt_tokens: number
  total_completion_tokens: number
}

export interface Message {
  role: 'user' | 'assistant'
  content: string
  usage?: TokenUsage
}

export interface DebugEntry {
  type: 'tool_call' | 'tool_result' | 'task_enter' | 'task_exit' | 'info' | 'context_compact' | 'condition_eval' | 'handoff'
  content: string
  timestamp: string
  before?: any[]
  after?: any[]
  summary?: string | null
  reason?: string
}

export interface TimelineItem {
  kind: 'message' | 'debug'
  message?: Message
  debug?: DebugEntry
}
