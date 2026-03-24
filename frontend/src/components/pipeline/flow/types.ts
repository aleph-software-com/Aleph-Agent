export interface HandoffDef {
  toolName: string
  label: string
}

export interface AgentVersionDef {
  version: number
  label: string
}

export interface AgentDef {
  id: string
  name: string
  handoffs: HandoffDef[]
  versions: AgentVersionDef[]
  currentVersion: number
}

export interface ToolItem {
  id: string
  name: string
}

export interface PipelineAgentNodeData {
  label: string
  agentId: string | null
  agentVersion: number | null
  versionLabel: string
  handoffs: HandoffDef[]
  agents: AgentDef[]
  versions: AgentVersionDef[]
  onSelect?: (agent: AgentDef) => void
  onVersionSelect?: (version: number, label: string) => void
  [key: string]: unknown
}

export interface PipelineToolNodeData {
  label: string
  items: ToolItem[]
  onSelect?: (name: string) => void
  [key: string]: unknown
}
