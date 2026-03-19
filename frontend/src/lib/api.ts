const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  if (res.status === 204) return undefined as T;
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `HTTP ${res.status}`);
  }
  return res.json();
}

// ────────────────────────────────────────
// Agents
// ────────────────────────────────────────
export const agents = {
  list: (opts?: { search?: string; cursor?: string; limit?: number }) => {
    const params = new URLSearchParams();
    if (opts?.search) params.set('search', opts.search);
    if (opts?.cursor) params.set('cursor', opts.cursor);
    if (opts?.limit) params.set('limit', String(opts.limit));
    const qs = params.toString();
    return request<any[]>(`/agents${qs ? `?${qs}` : ''}`);
  },
  get: (id: string) => request<any>(`/agents/${id}`),
  getFull: (id: string) => request<any>(`/agents/${id}/full`),
  create: (data: any) => request<any>('/agents', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) => request<any>(`/agents/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  remove: (id: string) => request<void>(`/agents/${id}`, { method: 'DELETE' }),
  // Versions
  getVersions: (id: string) => request<any[]>(`/agents/${id}/versions`),
  getVersion: (id: string, version: number) => request<any>(`/agents/${id}/versions/${version}`),
  createVersion: (id: string, data: any) => request<any>(`/agents/${id}/versions`, { method: 'POST', body: JSON.stringify(data) }),
  updateVersion: (id: string, version: number, data: any) => request<any>(`/agents/${id}/versions/${version}`, { method: 'PATCH', body: JSON.stringify(data) }),
  switchVersion: (id: string, version: number) => request<any>(`/agents/${id}/switch/${version}`, { method: 'POST' }),
};

// ────────────────────────────────────────
// Pipelines
// ────────────────────────────────────────
export const pipelines = {
  list: (opts?: { search?: string; cursor?: string; limit?: number }) => {
    const params = new URLSearchParams();
    if (opts?.search) params.set('search', opts.search);
    if (opts?.cursor) params.set('cursor', opts.cursor);
    if (opts?.limit) params.set('limit', String(opts.limit));
    const qs = params.toString();
    return request<any[]>(`/pipelines${qs ? `?${qs}` : ''}`);
  },
  get: (id: string) => request<any>(`/pipelines/${id}`),
  getFull: (id: string) => request<any>(`/pipelines/${id}/full`),
  create: (data: any) => request<any>('/pipelines', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) => request<any>(`/pipelines/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  remove: (id: string) => request<void>(`/pipelines/${id}`, { method: 'DELETE' }),
  // Versions
  getVersions: (id: string) => request<any[]>(`/pipelines/${id}/versions`),
  getVersion: (id: string, version: number) => request<any>(`/pipelines/${id}/versions/${version}`),
  createVersion: (id: string, data: any) => request<any>(`/pipelines/${id}/versions`, { method: 'POST', body: JSON.stringify(data) }),
  updateVersion: (id: string, version: number, data: any) => request<any>(`/pipelines/${id}/versions/${version}`, { method: 'PATCH', body: JSON.stringify(data) }),
  switchVersion: (id: string, version: number) => request<any>(`/pipelines/${id}/switch/${version}`, { method: 'POST' }),
};

// ────────────────────────────────────────
// API Keys
// ────────────────────────────────────────
export const apiKeys = {
  list: (opts?: { search?: string; cursor?: string; limit?: number }) => {
    const params = new URLSearchParams();
    if (opts?.search) params.set('search', opts.search);
    if (opts?.cursor) params.set('cursor', opts.cursor);
    if (opts?.limit) params.set('limit', String(opts.limit));
    const qs = params.toString();
    return request<any[]>(`/api-keys${qs ? `?${qs}` : ''}`);
  },
  listByAgent: (agentId: string) => request<any[]>(`/api-keys/agent/${agentId}`),
  listByPipeline: (pipelineId: string) => request<any[]>(`/api-keys/pipeline/${pipelineId}`),
  create: (data: any) => request<any>('/api-keys', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) => request<any>(`/api-keys/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  remove: (id: string) => request<void>(`/api-keys/${id}`, { method: 'DELETE' }),
};

// ────────────────────────────────────────
// Crypto (encrypt API keys server-side)
// ────────────────────────────────────────
export const crypto = {
  encryptKey: (key: string) =>
    request<{ encrypted: string; hint: string }>('/agents/encrypt-key', {
      method: 'POST',
      body: JSON.stringify({ key }),
    }),
};

// ────────────────────────────────────────
// SSE streaming (shared)
// ────────────────────────────────────────
async function streamSSE(
  url: string,
  messages: { role: string; content: string }[] | null,
  sessionId: string | null,
  onEvent: (event: string, data: any) => void,
  signal?: AbortSignal,
): Promise<void> {
  const reqBody: Record<string, any> = {};
  if (messages) reqBody.messages = messages;
  if (sessionId) reqBody.session_id = sessionId;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(reqBody),
    signal,
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(errBody.error || `HTTP ${res.status}`);
  }

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      let currentEvent = '';
      for (const line of lines) {
        if (line.startsWith('event: ')) {
          currentEvent = line.slice(7);
        } else if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            onEvent(currentEvent, data);
          } catch { /* skip malformed */ }
        }
      }
    }
  } catch (err: any) {
    if (err.name === 'AbortError') return;
    throw err;
  }
}

// ────────────────────────────────────────
// Sessions
// ────────────────────────────────────────
export const sessions = {
  remove: (id: string) => request<void>(`/sessions/${id}`, { method: 'DELETE' }),
};

// ────────────────────────────────────────
// Chat (SSE streaming)
// ────────────────────────────────────────
export const chat = {
  stream: (agentId: string, messages: { role: string; content: string }[] | null, sessionId: string | null, onEvent: (event: string, data: any) => void, signal?: AbortSignal) =>
    streamSSE(`${BASE}/agents/${agentId}/chat`, messages, sessionId, onEvent, signal),
};

// ────────────────────────────────────────
// Pipeline Chat (SSE streaming)
// ────────────────────────────────────────
export const pipelineChat = {
  stream: (pipelineId: string, messages: { role: string; content: string }[] | null, sessionId: string | null, onEvent: (event: string, data: any) => void, signal?: AbortSignal) =>
    streamSSE(`${BASE}/pipelines/${pipelineId}/chat`, messages, sessionId, onEvent, signal),
};
