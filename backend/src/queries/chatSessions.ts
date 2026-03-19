import { randomUUID } from 'crypto';

export interface ChatSession {
  id: string;
  agent_id: string;
  pipeline_id: string | null;
  current_agent_id: string | null;
  active_task_name: string | null;
  runtime_variables: Record<string, any>;
  completed_tasks: string[];
  message_history: any[];
  context_summary: string | null;
  created_at: Date;
  last_accessed: Date;
}

const store = new Map<string, ChatSession>();

// TTL cleanup: remove sessions inactive for more than 1 hour
const SESSION_TTL_MS = 60 * 60 * 1000;

function cleanup() {
  const cutoff = Date.now() - SESSION_TTL_MS;
  for (const [id, session] of store) {
    if (session.last_accessed.getTime() < cutoff) {
      store.delete(id);
    }
  }
}

// Run cleanup every 5 minutes
setInterval(cleanup, 5 * 60 * 1000);

export function create(agentId: string): ChatSession {

  const now = new Date();
  const session: ChatSession = {
    id: randomUUID(),
    agent_id: agentId,
    pipeline_id: null,
    current_agent_id: null,
    active_task_name: null,
    runtime_variables: {},
    completed_tasks: [],
    message_history: [],
    context_summary: null,
    created_at: now,
    last_accessed: now,
  };
  store.set(session.id, session);
  return session;
}

export function createPipeline(pipelineId: string, entryAgentId: string): ChatSession {

  const now = new Date();
  const session: ChatSession = {
    id: randomUUID(),
    agent_id: entryAgentId,
    pipeline_id: pipelineId,
    current_agent_id: entryAgentId,
    active_task_name: null,
    runtime_variables: {},
    completed_tasks: [],
    message_history: [],
    context_summary: null,
    created_at: now,
    last_accessed: now,
  };
  store.set(session.id, session);
  return session;
}

export function findById(id: string): ChatSession | null {
  const session = store.get(id) ?? null;
  if (session) session.last_accessed = new Date();
  return session;
}

export function update(
  id: string,
  data: {
    active_task_name?: string | null;
    runtime_variables?: Record<string, any>;
    completed_tasks?: string[];
    message_history?: any[];
    context_summary?: string | null;
    current_agent_id?: string | null;
  },
): ChatSession | null {
  const session = store.get(id);
  if (!session) return null;
  if (data.active_task_name !== undefined) session.active_task_name = data.active_task_name;
  if (data.runtime_variables !== undefined) session.runtime_variables = data.runtime_variables;
  if (data.completed_tasks !== undefined) session.completed_tasks = data.completed_tasks;
  if (data.message_history !== undefined) session.message_history = data.message_history;
  if (data.context_summary !== undefined) session.context_summary = data.context_summary;
  if (data.current_agent_id !== undefined) session.current_agent_id = data.current_agent_id;
  session.last_accessed = new Date();
  return session;
}

export function remove(id: string): boolean {
  return store.delete(id);
}
