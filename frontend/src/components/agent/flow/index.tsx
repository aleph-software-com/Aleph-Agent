import { ReactFlowProvider } from '@xyflow/react'
import FlowCanvas from './FlowCanvas'
import type { TaskDef, ToolDef } from './types'

export type { TaskDef, ToolDef }

interface FlowTabProps {
  agentName: string
  tasks?: TaskDef[]
  tools?: ToolDef[]
  flowData?: any
  onFlowChange?: (data: any) => void
}

export default function FlowTab({ agentName, tasks = [], tools = [], flowData, onFlowChange }: FlowTabProps) {
  return (
    <ReactFlowProvider>
      <FlowCanvas agentName={agentName} tasks={tasks} tools={tools} flowData={flowData} onFlowChange={onFlowChange} />
    </ReactFlowProvider>
  )
}
