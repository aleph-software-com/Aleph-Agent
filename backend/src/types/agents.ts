export interface FlowData {
  nodes: unknown[];
  edges: unknown[];
}

export interface Agent {
  id: string;
  name: string;
  current_version: number;
  created_at: string;
}

export interface AgentCreate {
  name: string;
}

export interface AgentUpdate {
  name?: string;
  current_version?: number;
}

// ── Snapshot sub-types ──

export interface SnapshotTask {
  id: string;
  name: string;
  description: string;
  prompt: string;
  exit_condition: string;
}

export type ToolType = 'http' | 'extraction' | 'handoff';

export interface SnapshotTool {
  id: string;
  name: string;
  description: string;
  type: ToolType;
  config: any;
}

// Alias for chat engine compatibility
export type Tool = SnapshotTool;

// ── Tool config sub-types (used by chat engine) ──

export interface HttpHeaderEntry { key: string; value: string; }
export interface HttpBodyField { key: string; value_mode: 'variable' | 'fixed' | 'llm'; variable_id?: string; fixed_value?: string; description?: string; field_type?: string; }
export interface HttpConfig { method: string; url: string; headers: HttpHeaderEntry[]; body_fields: HttpBodyField[]; }
export interface ExtractionField { name: string; type: string; description: string; }
export interface ExtractionConfig { fields: ExtractionField[]; }
export interface HandoffConfig { target_type: string; transfer_message: string; context_options: string[]; }

// ── Agent Snapshot ──

export interface AgentSnapshot {
  description: string;
  system_prompt: string;
  llm_provider: string;
  llm_model: string;
  llm_config: Record<string, unknown>;
  tts_provider: string | null;
  tts_model: string | null;
  tts_config: Record<string, unknown>;
  stt_provider: string | null;
  stt_model: string | null;
  stt_config: Record<string, unknown>;
  flow_data: FlowData;
  tasks: SnapshotTask[];
  tools: SnapshotTool[];
}

// ── Version types ──

export interface AgentVersion {
  id: string;
  agent_id: string;
  version: number;
  label: string;
  notes: string;
  snapshot: AgentSnapshot;
  created_at: string;
}

export interface AgentVersionCreate {
  agent_id: string;
  version: number;
  label?: string;
  notes?: string;
  snapshot: AgentSnapshot;
}

export interface AgentVersionUpdate {
  label?: string;
  notes?: string;
  snapshot?: AgentSnapshot;
}

export const defaultAgentSnapshot: AgentSnapshot = {
  description: '',
  system_prompt: '',
  llm_provider: 'openai',
  llm_model: 'gpt-4o',
  llm_config: {},
  tts_provider: null,
  tts_model: null,
  tts_config: {},
  stt_provider: null,
  stt_model: null,
  stt_config: {},
  flow_data: { nodes: [], edges: [] },
  tasks: [],
  tools: [],
};
