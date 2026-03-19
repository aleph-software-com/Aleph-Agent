import { ReactFlowProvider } from '@xyflow/react'
import FlowCanvas from './FlowCanvas'

interface PipelineFlowTabProps {
  agents: any[]
  tools?: any[]
  flowData?: any
  onFlowChange?: (data: any) => void
}

export default function PipelineFlowTab({ agents, tools = [], flowData, onFlowChange }: PipelineFlowTabProps) {
  return (
    <ReactFlowProvider>
      <FlowCanvas agents={agents} tools={tools} flowData={flowData} onFlowChange={onFlowChange} />
    </ReactFlowProvider>
  )
}
