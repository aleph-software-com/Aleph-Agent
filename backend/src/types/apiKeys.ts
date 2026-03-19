export interface ApiKey {
  id: string;
  agent_id: string | null;
  pipeline_id: string | null;
  name: string;
  key: string;
  version: number | null;
  enabled: boolean;
  rate_limit: number;
  request_count: number;
  session_count: number;
  last_used_at: string | null;
  created_at: string;
}

export interface ApiKeyCreate {
  agent_id?: string;
  pipeline_id?: string;
  name: string;
  version?: number;
  rate_limit?: number;
}

export interface ApiKeyUpdate {
  name?: string;
  enabled?: boolean;
  rate_limit?: number;
  version?: number;
}
