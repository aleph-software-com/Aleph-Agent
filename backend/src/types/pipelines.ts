import type { FlowData, SnapshotTool } from './agents.js';

export interface Pipeline {
  id: string;
  name: string;
  current_version: number;
  created_at: string;
}

export interface PipelineCreate {
  name: string;
}

export interface PipelineUpdate {
  name?: string;
  current_version?: number;
}

export interface PipelineSnapshot {
  description: string;
  prompt: string;
  flow_data: FlowData;
  tools: SnapshotTool[];
}

export interface PipelineVersion {
  id: string;
  pipeline_id: string;
  version: number;
  label: string;
  notes: string;
  snapshot: PipelineSnapshot;
  created_at: string;
}

export interface PipelineVersionCreate {
  pipeline_id: string;
  version: number;
  label?: string;
  notes?: string;
  snapshot: PipelineSnapshot;
}

export interface PipelineVersionUpdate {
  label?: string;
  notes?: string;
  snapshot?: PipelineSnapshot;
}

export const defaultPipelineSnapshot: PipelineSnapshot = {
  description: '',
  prompt: '',
  flow_data: { nodes: [], edges: [] },
  tools: [],
};
