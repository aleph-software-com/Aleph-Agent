import { FiDatabase } from 'react-icons/fi'
import { RiRobot3Line } from 'react-icons/ri'
import { LuBrain, LuMessageSquare, LuListChecks, LuWrench, LuWorkflow } from 'react-icons/lu'
import EntityHeader from '../shared/EntityHeader'
import type { Version } from '../ui/VersionDropdown'

const agentTabs = [
  { id: 'model', label: 'Model', icon: LuBrain },
  { id: 'prompt', label: 'Prompt', icon: LuMessageSquare },
  { id: 'task', label: 'Task', icon: LuListChecks },
  { id: 'tools', label: 'Tools', icon: LuWrench },
  { id: 'context', label: 'Context', icon: FiDatabase },
  { id: 'flow', label: 'Flow', icon: LuWorkflow },
]

interface AgentHeaderProps {
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

export default function AgentHeader({ name, activeTab, onTabChange, onChat, onNameChange, versions, currentVersion, onVersionSwitch, onVersionCreate, onVersionUpdate }: AgentHeaderProps) {
  return (
    <EntityHeader
      name={name}
      icon={RiRobot3Line}
      tabs={agentTabs}
      activeTab={activeTab}
      onTabChange={onTabChange}
      onChat={onChat}
      onNameChange={onNameChange}
      versions={versions}
      currentVersion={currentVersion}
      onVersionSwitch={onVersionSwitch}
      onVersionCreate={onVersionCreate}
      onVersionUpdate={onVersionUpdate}
      badge={
        <span
          className="text-[11px] font-medium px-2 py-0.5 rounded-full ml-1"
          style={{ background: 'var(--bg-light)', color: 'var(--highlight)', border: '1px solid var(--border-muted)' }}
        >
          ~$0.03/min
        </span>
      }
    />
  )
}
