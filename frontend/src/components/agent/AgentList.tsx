import { RiRobot3Line } from 'react-icons/ri'
import EntityList from '../shared/EntityList'
import type { EntityItem } from '../shared/EntityList'

interface AgentListProps {
  agents: EntityItem[]
  selectedId: string | null
  hasMore: boolean
  onSelect: (id: string) => void
  onCreate: () => void
  onDelete?: (id: string) => void
  onSearch: (query: string) => void
  onLoadMore: () => void
}

export default function AgentList({ agents, selectedId, hasMore, onSelect, onCreate, onDelete, onSearch, onLoadMore }: AgentListProps) {
  return (
    <EntityList
      title="Agents"
      deleteTitle="Delete agent"
      createLabel="Create agent"
      icon={RiRobot3Line}
      items={agents}
      selectedId={selectedId}
      hasMore={hasMore}
      onSelect={onSelect}
      onCreate={onCreate}
      onDelete={onDelete}
      onSearch={onSearch}
      onLoadMore={onLoadMore}
    />
  )
}
