import ToolsTab from '../agent/ToolsTab'

interface PipelineToolsTabProps {
  tools: any[]
  onUpdateTools: (tools: any[]) => void
}

export default function PipelineToolsTab({ tools, onUpdateTools }: PipelineToolsTabProps) {
  return (
    <ToolsTab
      tools={tools}
      allTools={tools}
      onUpdateTools={onUpdateTools}
    />
  )
}
