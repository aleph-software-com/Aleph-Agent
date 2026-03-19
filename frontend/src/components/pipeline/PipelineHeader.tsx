import { LuLayers, LuMessageSquare, LuWrench, LuWorkflow } from 'react-icons/lu'
import EntityHeader from '../shared/EntityHeader'
import type { Version } from '../ui/VersionDropdown'

const pipelineTabs = [
  { id: 'prompt', label: 'Prompt', icon: LuMessageSquare },
  { id: 'tools', label: 'Tools', icon: LuWrench },
  { id: 'flow', label: 'Flow', icon: LuWorkflow },
]

interface PipelineHeaderProps {
  name: string
  activeTab: string
  onTabChange: (tab: string) => void
  onChat: () => void
  onNameChange: (name: string) => void
  versions: Version[]
  currentVersion: number
  onVersionSwitch: (version: number) => void
  onVersionCreate: (notes: string, label: string) => void
  onVersionUpdate: (version: number, notes: string, label: string) => void
}

export default function PipelineHeader({ name, activeTab, onTabChange, onChat, onNameChange, versions, currentVersion, onVersionSwitch, onVersionCreate, onVersionUpdate }: PipelineHeaderProps) {
  return (
    <EntityHeader
      name={name}
      icon={LuLayers}
      tabs={pipelineTabs}
      activeTab={activeTab}
      onTabChange={onTabChange}
      onChat={onChat}
      onNameChange={onNameChange}
      versions={versions}
      currentVersion={currentVersion}
      onVersionSwitch={onVersionSwitch}
      onVersionCreate={onVersionCreate}
      onVersionUpdate={onVersionUpdate}
    />
  )
}
