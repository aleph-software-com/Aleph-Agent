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
// Crypto
// ────────────────────────────────────────
export const crypto = {
  encryptKey: (key: string) =>
    request<{ encrypted: string; hint: string }>('/agents/encrypt-key', {
      method: 'POST',
      body: JSON.stringify({ key }),
    }),
};

// ────────────────────────────────────────
// Sessions
// ────────────────────────────────────────
export const sessions = {
  remove: (id: string) => request<void>(`/sessions/${id}`, { method: 'DELETE' }),
};
