import { FiUser, FiSettings, FiDatabase } from 'react-icons/fi'
import { LuLayers, LuListChecks, LuMessageSquare, LuWrench } from 'react-icons/lu'
import { RiRobot3Line } from 'react-icons/ri'

export function labelIcon(label: string, role: string) {
  switch (label) {
    case 'PIPELINE':
    case 'PIPELINE PROMPT': return <LuLayers size={14} />
    case 'SYSTEM PROMPT': return <LuMessageSquare size={14} />
    case 'TASK': return <LuListChecks size={14} />
    case 'MEMORY': return <FiDatabase size={14} />
    case 'CONTEXT TRANSFERRED': return <FiDatabase size={14} />
    case 'TOOL CALL': return <LuWrench size={14} />
    case 'TOOL RESULT': return <LuWrench size={14} />
    default: break
  }
  switch (role) {
    case 'user': return <FiUser size={14} />
    case 'assistant': return <RiRobot3Line size={14} />
    case 'tool': return <LuWrench size={14} />
    default: return <FiSettings size={14} />
  }
}

export function labelColor(label: string, role: string) {
  switch (label) {
    case 'PIPELINE':
    case 'PIPELINE PROMPT': return 'var(--c-pipeline)'
    case 'SYSTEM PROMPT': return 'var(--c-prompt)'
    case 'TASK': return 'var(--c-task)'
    case 'MEMORY': return 'var(--c-context)'
    case 'CONTEXT TRANSFERRED': return 'var(--c-context)'
    case 'TOOL CALL': return 'var(--c-tools)'
    case 'TOOL RESULT': return 'var(--c-tools)'
    default: break
  }
  switch (role) {
    case 'user': return 'var(--c-user)'
    case 'assistant': return 'var(--c-agent)'
    case 'tool': return 'var(--c-tools)'
    default: return 'var(--text-muted)'
  }
}

export function roleLabel(role: string, _index: number, content?: string | null, hasToolCalls?: boolean) {
  if (role === 'pipeline') return 'PIPELINE'
  if (role === 'agent') return 'AGENT'
  if (role === 'assistant' && hasToolCalls) return 'TOOL CALL'
  if (role === 'tool') return 'TOOL RESULT'
  if (role !== 'system') return role.toUpperCase()
  if (content?.startsWith('[MÉMOIRE') || content?.startsWith('[MEMORY')) return 'MEMORY'
  if (content?.startsWith('[PIPELINE')) return 'PIPELINE PROMPT'
  if (content?.startsWith('[CONTEXTE TRANSFÉRÉ') || content?.startsWith('[CONTEXT TRANSFERRED')) return 'CONTEXT TRANSFERRED'
  if (content?.startsWith('TASK EN COURS:') || content?.startsWith('CURRENT TASK:')) return 'TASK'
  return 'SYSTEM PROMPT'
}

export function msgPreview(msg: any): string {
  if (msg.role === 'tool') return `tool result → ${(msg.content || '').slice(0, 50)}...`
  if (msg.tool_calls) return `tool call → ${msg.tool_calls.map((tc: any) => tc.function?.name).join(', ')}`
  const text = typeof msg.content === 'string' ? msg.content : ''
  return `${msg.role} → ${text.length > 50 ? text.slice(0, 50) + '...' : text}`
}

export function contextLabel(opt: string): string {
  switch (opt) {
    case 'none': return 'Nothing'
    case 'extracted': return 'Extracted data'
    case 'full': return 'Full history'
    default: return opt
  }
}
