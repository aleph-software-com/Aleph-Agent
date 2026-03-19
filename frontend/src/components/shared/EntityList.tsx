import { useState, useRef, useCallback, useEffect } from 'react'
import { FiPlus, FiSearch, FiMoreVertical } from 'react-icons/fi'
import MoreMenu from '../ui/MoreMenu'
import DeleteModal from '../ui/DeleteModal'

export interface EntityItem {
  id: string
  name: string
  status: 'draft' | 'published'
  color: string
  created_at?: string
}

interface EntityListProps {
  title: string
  deleteTitle: string
  createLabel: string
  icon: React.ComponentType<{ size: number; style?: React.CSSProperties }>
  items: EntityItem[]
  selectedId: string | null
  hasMore: boolean
  onSelect: (id: string) => void
  onCreate: () => void
  onDelete?: (id: string) => void
  onSearch: (query: string) => void
  onLoadMore: () => void
}

export default function EntityList({
  title,
  deleteTitle,
  createLabel,
  icon: Icon,
  items,
  selectedId,
  hasMore,
  onSelect,
  onCreate,
  onDelete,
  onSearch,
  onLoadMore,
}: EntityListProps) {
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null)
  const [search, setSearch] = useState('')
  const listRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleSearchChange = (value: string) => {
    setSearch(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      onSearch(value)
    }, 300)
  }

  const handleScroll = useCallback(() => {
    const el = listRef.current
    if (!el || !hasMore) return
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 40) {
      onLoadMore()
    }
  }, [hasMore, onLoadMore])

  useEffect(() => {
    const el = listRef.current
    if (!el) return
    el.addEventListener('scroll', handleScroll)
    return () => el.removeEventListener('scroll', handleScroll)
  }, [handleScroll])

  return (
    <aside
      className="flex flex-col h-full w-75 shrink-0 overflow-hidden"
      style={{ background: 'var(--bg)', borderRight: '1px solid var(--border-muted)' }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 h-14 shrink-0"
        style={{ borderBottom: '1px solid var(--border-muted)' }}
      >
        <span className="text-[13px] font-semibold uppercase tracking-wider" style={{ color: 'var(--highlight)' }}>
          {title}
        </span>
        <span
          className="text-[11px] font-medium px-1.5 py-0.5 rounded-md"
          style={{ background: 'var(--bg-light)', color: 'var(--highlight)' }}
        >
          {items.length}{hasMore ? '+' : ''}
        </span>
      </div>

      {/* Search */}
      <div className="px-4 py-3 shrink-0">
        <div className="relative">
          <FiSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--highlight)' }} />
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-[13px] rounded-lg"
            style={{ background: 'var(--bg-light)', border: '1px solid var(--border-muted)' }}
          />
        </div>
      </div>

      {/* Create button */}
      <div className="px-4 pb-2 shrink-0">
        <button
          onClick={onCreate}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-[13px] font-semibold transition-all duration-200 cursor-pointer"
          style={{ background: 'var(--primary)', color: 'var(--bg-dark)' }}
          onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.9' }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = '1' }}
        >
          <FiPlus size={15} />
          {createLabel}
        </button>
      </div>

      {/* List */}
      <div ref={listRef} className="flex-1 overflow-y-auto px-3 pb-3">
        <div className="flex flex-col gap-1">
          {items.map((item) => {
            const isSelected = selectedId === item.id
            return (
              <div key={item.id} className="relative group">
                <button
                  onClick={() => onSelect(item.id)}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 text-left cursor-pointer"
                  style={{
                    background: isSelected ? 'var(--bg-light)' : 'transparent',
                    border: isSelected ? '1px solid var(--border)' : '1px solid transparent',
                  }}
                  onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = 'var(--bg-light)' }}
                  onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = isSelected ? 'var(--bg-light)' : 'transparent' }}
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                    style={{
                      background: isSelected ? 'var(--primary-hover)' : 'var(--bg-light)',
                      border: `1px solid ${isSelected ? 'var(--border)' : 'var(--border-muted)'}`,
                    }}
                  >
                    <Icon size={14} style={{ color: isSelected ? 'var(--primary)' : 'var(--highlight)' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div
                      className="text-[13px] font-medium truncate"
                      style={{ color: isSelected ? 'var(--text)' : 'var(--text-muted)' }}
                    >
                      {item.name}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <div
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ background: item.status === 'published' ? 'var(--success)' : 'var(--highlight)' }}
                      />
                      <span className="text-[11px]" style={{ color: 'var(--highlight)' }}>
                        {item.status === 'published' ? 'Published' : 'Draft'}
                      </span>
                    </div>
                  </div>

                  {/* Three-dot menu */}
                  <div className="shrink-0 relative" onClick={(e) => e.stopPropagation()}>
                    <div
                      onClick={(e) => {
                        e.stopPropagation()
                        setMenuOpenId(menuOpenId === item.id ? null : item.id)
                      }}
                      className="w-6 h-6 rounded-md flex items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                      style={{
                        color: 'var(--highlight)',
                        opacity: menuOpenId === item.id ? 1 : undefined,
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg)'; e.currentTarget.style.color = 'var(--text)' }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--highlight)' }}
                    >
                      <FiMoreVertical size={13} />
                    </div>
                    {menuOpenId === item.id && (
                      <MoreMenu
                        onDelete={() => {
                          setMenuOpenId(null)
                          setDeleteTarget({ id: item.id, name: item.name })
                        }}
                        onClose={() => setMenuOpenId(null)}
                      />
                    )}
                  </div>
                </button>
              </div>
            )
          })}
        </div>
      </div>

      {deleteTarget && (
        <DeleteModal
          title={deleteTitle}
          name={deleteTarget.name}
          onConfirm={() => { onDelete?.(deleteTarget.id); setDeleteTarget(null) }}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </aside>
  )
}
