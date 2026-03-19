export interface HandoffDef {
  toolName: string
  label: string
}

export interface AgentDef {
  id: string
  name: string
  handoffs: HandoffDef[]
}

export interface ToolItem {
  id: string
  name: string
}

export interface PipelineAgentNodeData {
  label: string
  agentId: string | null
  handoffs: HandoffDef[]
  agents: AgentDef[]
  onSelect?: (agent: AgentDef) => void
  [key: string]: unknown
}

export interface PipelineToolNodeData {
  label: string
  items: ToolItem[]
  onSelect?: (name: string) => void
  [key: string]: unknown
}
