import PromptTab from '../agent/PromptTab'

interface PipelinePromptTabProps {
  prompt: string
  onUpdate: (prompt: string) => void
}

export default function PipelinePromptTab({ prompt, onUpdate }: PipelinePromptTabProps) {
  return (
    <PromptTab
      prompt={prompt}
      onUpdate={onUpdate}
      title="Global Prompt"
      placeholder="Prompt injected into all agents in this pipeline..."
      description="This prompt is automatically injected into every agent's instructions in this pipeline. It is added before each agent's own prompt."
    />
  )
}
