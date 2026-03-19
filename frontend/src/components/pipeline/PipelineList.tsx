import { LuLayers } from 'react-icons/lu'
import EntityList from '../shared/EntityList'
import type { EntityItem } from '../shared/EntityList'

interface PipelineListProps {
  pipelines: EntityItem[]
  selectedId: string | null
  hasMore: boolean
  onSelect: (id: string) => void
  onCreate: () => void
  onDelete?: (id: string) => void
  onSearch: (query: string) => void
  onLoadMore: () => void
}

export default function PipelineList({ pipelines, selectedId, hasMore, onSelect, onCreate, onDelete, onSearch, onLoadMore }: PipelineListProps) {
  return (
    <EntityList
      title="Pipelines"
      deleteTitle="Delete pipeline"
      createLabel="Create pipeline"
      icon={LuLayers}
      items={pipelines}
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
