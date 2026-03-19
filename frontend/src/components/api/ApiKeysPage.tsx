import { useState, useEffect, useRef } from 'react'
import {
  FiPlus, FiSearch, FiCopy, FiCheck, FiTrash2,
  FiAlertTriangle, FiX, FiMoreVertical, FiActivity,
  FiUsers, FiClock, FiShield, FiZap,
} from 'react-icons/fi'
import { RiRobot3Line } from 'react-icons/ri'
import { LuLayers } from 'react-icons/lu'
import { MdKey } from 'react-icons/md'
import * as api from '../../lib/api'
import Dropdown from '../ui/Dropdown'
import MoreMenu from '../ui/MoreMenu'
import DeleteModal from '../ui/DeleteModal'

interface ApiKeyRow {
  id: string
  agent_id: string | null
  pipeline_id: string | null
  name: string
  key: string
  version: number | null
  enabled: boolean
  rate_limit: number
  request_count: number
  session_count: number
  last_used_at: string | null
  created_at: string
}

interface EntityOption {
  id: string
  name: string
  type: 'agent' | 'pipeline'
  current_version: number
  versions: { version: number; label: string }[]
}

function timeAgo(dateStr: string | null) {
  if (!dateStr) return 'Never'
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "Just now"
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

export default function ApiKeysPage() {
  const PAGE_SIZE = 20

  const [keys, setKeys] = useState<ApiKeyRow[]>([])
  const [keysHasMore, setKeysHasMore] = useState(false)
  const [entities, setEntities] = useState<EntityOption[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // Create form
  const [showCreate, setShowCreate] = useState(false)
  const [newKey, setNewKey] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [createName, setCreateName] = useState('')
  const [createType, setCreateType] = useState<'agent' | 'pipeline'>('agent')
  const [createEntityId, setCreateEntityId] = useState('')
  const [createVersion, setCreateVersion] = useState<number | null>(null)

  // Rate limit editing
  const [editingRateLimit, setEditingRateLimit] = useState(false)
  const [editRateLimit, setEditRateLimit] = useState('')

  const loadKeys = async (searchQuery?: string, cursor?: string) => {
    try {
      const results = await api.apiKeys.list({ search: searchQuery || undefined, cursor, limit: PAGE_SIZE })
      if (cursor) {
        setKeys((prev) => [...prev, ...results])
      } else {
        setKeys(results)
      }
      setKeysHasMore(results.length >= PAGE_SIZE)
    } catch {}
  }

  const loadEntities = async () => {
    try {
      const [agentsList, pipelinesList] = await Promise.all([api.agents.list(), api.pipelines.list()])
      const opts: EntityOption[] = []
      for (const a of agentsList) {
        const versions = await api.agents.getVersions(a.id)
        opts.push({ id: a.id, name: a.name, type: 'agent', current_version: a.current_version ?? 1, versions: versions.map((v: any) => ({ version: v.version, label: v.label || '' })) })
      }
      for (const p of pipelinesList) {
        const versions = await api.pipelines.getVersions(p.id)
        opts.push({ id: p.id, name: p.name, type: 'pipeline', current_version: p.current_version ?? 1, versions: versions.map((v: any) => ({ version: v.version, label: v.label || '' })) })
      }
      setEntities(opts)
    } catch {}
  }

  useEffect(() => { loadKeys(); loadEntities() }, [])

  const handleSearchChange = (value: string) => {
    setSearch(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => loadKeys(value), 300)
  }

  const handleScrollKeys = () => {
    const el = listRef.current
    if (!el || !keysHasMore) return
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 40) {
      const last = keys[keys.length - 1]
      if (last?.created_at) loadKeys(search, last.created_at)
    }
  }

  const filteredKeys = keys
  const selected = keys.find((k) => k.id === selectedId) || null
  const selectedEntity = entities.find((e) => e.id === createEntityId)

  const getEntityName = (key: ApiKeyRow) => entities.find((e) => e.id === (key.agent_id || key.pipeline_id))?.name || '—'
  const getEntityType = (key: ApiKeyRow) => key.agent_id ? 'Agent' : key.pipeline_id ? 'Pipeline' : '—'

  const handleCreate = async () => {
    if (!createName.trim() || !createEntityId) return
    const entity = entities.find((e) => e.id === createEntityId)
    if (!entity) return
    const data: any = {
      name: createName.trim(),
      ...(entity.type === 'agent' ? { agent_id: entity.id } : { pipeline_id: entity.id }),
    }
    if (createVersion !== null) data.version = createVersion
    const created = await api.apiKeys.create(data)
    setNewKey(created.key)
    setCreateName('')
    setCreateType('agent')
    setCreateEntityId('')
    setCreateVersion(null)
    setShowCreate(false)
    await loadKeys(search)
    setSelectedId(created.id)
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    await api.apiKeys.remove(deleteTarget.id)
    if (selectedId === deleteTarget.id) setSelectedId(null)
    setDeleteTarget(null)
    loadKeys(search)
  }

  const handleToggle = async () => {
    if (!selected) return
    await api.apiKeys.update(selected.id, { enabled: !selected.enabled })
    loadKeys(search)
  }

  const handleUpdateRateLimit = async () => {
    if (!selected) return
    const val = parseInt(editRateLimit)
    if (!isNaN(val) && val > 0) {
      await api.apiKeys.update(selected.id, { rate_limit: val })
      loadKeys(search)
    }
    setEditingRateLimit(false)
  }

  const handleCopy = () => {
    if (newKey) {
      navigator.clipboard.writeText(newKey)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="flex-1 flex h-full overflow-hidden">
      {/* ──── Sidebar ──── */}
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
            API Keys
          </span>
          <span
            className="text-[11px] font-medium px-1.5 py-0.5 rounded-md"
            style={{ background: 'var(--bg-light)', color: 'var(--highlight)' }}
          >
            {keys.length}
          </span>
        </div>

        {/* Search */}
        <div className="px-4 py-3 shrink-0">
          <div className="relative">
            <FiSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--highlight)' }} />
            <input
              type="text"
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search..."
              className="w-full pl-9 pr-3 py-2 text-[13px] rounded-lg"
              style={{ background: 'var(--bg-light)', border: '1px solid var(--border-muted)', color: 'var(--text)' }}
            />
          </div>
        </div>

        {/* Create button */}
        <div className="px-4 pb-2 shrink-0">
          <button
            onClick={() => setShowCreate(true)}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-[13px] font-semibold transition-all duration-200 cursor-pointer"
            style={{ background: 'var(--primary)', color: 'var(--bg-dark)' }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.9' }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '1' }}
          >
            <FiPlus size={15} />
            New key
          </button>
        </div>

        {/* List */}
        <div ref={listRef} onScroll={handleScrollKeys} className="flex-1 overflow-y-auto px-3 pb-3">
          <div className="flex flex-col gap-1">
            {filteredKeys.map((k) => {
              const isSelected = selectedId === k.id
              return (
                <div key={k.id} className="relative group">
                  <button
                    onClick={() => { setSelectedId(k.id); setNewKey(null) }}
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
                      <MdKey size={14} style={{ color: isSelected ? 'var(--primary)' : 'var(--highlight)' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div
                        className="text-[13px] font-medium truncate"
                        style={{ color: isSelected ? 'var(--text)' : 'var(--text-muted)' }}
                      >
                        {k.name}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <div
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ background: k.enabled ? 'var(--success, #22c55e)' : 'var(--highlight)' }}
                        />
                        <span className="text-[11px]" style={{ color: 'var(--highlight)' }}>
                          {getEntityType(k)} · {getEntityName(k)}
                        </span>
                      </div>
                    </div>

                    {/* Three-dot menu */}
                    <div className="shrink-0 relative" onClick={(e) => e.stopPropagation()}>
                      <div
                        onClick={(e) => { e.stopPropagation(); setMenuOpenId(menuOpenId === k.id ? null : k.id) }}
                        className="w-6 h-6 rounded-md flex items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                        style={{ color: 'var(--highlight)', opacity: menuOpenId === k.id ? 1 : undefined }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg)'; e.currentTarget.style.color = 'var(--text)' }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--highlight)' }}
                      >
                        <FiMoreVertical size={13} />
                      </div>
                      {menuOpenId === k.id && (
                        <MoreMenu
                          onDelete={() => { setMenuOpenId(null); setDeleteTarget({ id: k.id, name: k.name }) }}
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
      </aside>

      {/* ──── Detail Panel ──── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden" style={{ background: 'var(--bg-dark)' }}>
        {selected ? (
          <>
            {/* Header */}
            <div
              className="flex items-center justify-between px-8 h-14 shrink-0"
              style={{ borderBottom: '1px solid var(--border-muted)' }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: 'var(--primary-hover)', border: '1px solid var(--border)' }}
                >
                  <MdKey size={15} style={{ color: 'var(--primary)' }} />
                </div>
                <div>
                  <h2 className="text-[15px] font-semibold" style={{ color: 'var(--text)' }}>{selected.name}</h2>
                  <div className="flex items-center gap-2 -mt-0.5">
                    <code className="text-[11px] font-mono" style={{ color: 'var(--highlight)' }}>{selected.key}</code>
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                      style={{
                        background: selected.agent_id ? 'var(--primary-hover)' : 'rgba(59,130,246,0.1)',
                        color: selected.agent_id ? 'var(--primary)' : 'var(--info, #3b82f6)',
                      }}
                    >
                      {getEntityType(selected)} · {getEntityName(selected)}
                      {selected.version !== null && ` · v${selected.version}`}
                    </span>
                  </div>
                </div>
              </div>
              <span className="text-[11px]" style={{ color: 'var(--highlight)' }}>
                Created on {formatDate(selected.created_at)}
              </span>
            </div>

            {/* New key banner */}
            {newKey && (
              <div
                className="mx-8 mt-6 rounded-xl p-5"
                style={{ background: 'var(--bg)', border: '1px solid var(--warning, #f59e0b)' }}
              >
                <div className="flex items-start gap-3">
                  <FiAlertTriangle size={18} className="shrink-0 mt-0.5" style={{ color: 'var(--warning, #f59e0b)' }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold mb-1" style={{ color: 'var(--text)' }}>
                      Save your API key
                    </p>
                    <p className="text-[12px] mb-3" style={{ color: 'var(--text-muted)' }}>
                      This key will never be shown again. Copy it now and store it securely.
                    </p>
                    <div className="flex items-center gap-2">
                      <code
                        className="flex-1 px-3 py-2 rounded-lg text-[12px] font-mono select-all"
                        style={{ background: 'var(--bg-dark)', border: '1px solid var(--border-muted)', color: 'var(--text)' }}
                      >
                        {newKey}
                      </code>
                      <button
                        onClick={handleCopy}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-medium cursor-pointer shrink-0"
                        style={{
                          background: copied ? 'var(--success, #22c55e)' : 'var(--bg-light)',
                          color: copied ? '#fff' : 'var(--text-muted)',
                          border: copied ? 'none' : '1px solid var(--border-muted)',
                        }}
                      >
                        {copied ? <FiCheck size={13} /> : <FiCopy size={13} />}
                        {copied ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                  </div>
                  <button onClick={() => setNewKey(null)} className="shrink-0 cursor-pointer" style={{ color: 'var(--highlight)', background: 'none', border: 'none' }}>
                    <FiX size={16} />
                  </button>
                </div>
              </div>
            )}

            {/* Stats + Settings */}
            <div className="flex-1 overflow-y-auto p-8">
              <div className="mx-auto w-full max-w-2xl flex flex-col gap-6">

                {/* Stats cards */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { icon: FiActivity, label: 'Requests', value: selected.request_count.toLocaleString(), color: 'var(--primary)' },
                    { icon: FiUsers, label: 'Sessions', value: selected.session_count.toLocaleString(), color: 'var(--success, #22c55e)' },
                    { icon: FiClock, label: 'Last used', value: timeAgo(selected.last_used_at), color: 'var(--warning, #f59e0b)' },
                  ].map((stat) => (
                    <div
                      key={stat.label}
                      className="rounded-xl p-4"
                      style={{ background: 'var(--bg)', border: '1px solid var(--border-muted)' }}
                    >
                      <div className="flex items-center gap-2.5 mb-2">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center"
                          style={{ background: `${stat.color}15` }}
                        >
                          <stat.icon size={15} style={{ color: stat.color }} />
                        </div>
                        <span className="text-[11px] font-medium" style={{ color: 'var(--highlight)' }}>
                          {stat.label}
                        </span>
                      </div>
                      <div className="text-[22px] font-bold pl-0.5" style={{ color: 'var(--text)' }}>
                        {stat.value}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Configuration */}
                <div
                  className="rounded-xl"
                  style={{ background: 'var(--bg)', border: '1px solid var(--border-muted)' }}
                >
                  <div
                    className="px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider"
                    style={{ color: 'var(--highlight)', borderBottom: '1px solid var(--border-muted)' }}
                  >
                    Configuration
                  </div>

                  {/* Rate limit */}
                  <div
                    className="flex items-center justify-between px-5 py-4"
                    style={{ borderBottom: '1px solid var(--border-muted)' }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--bg-light)', border: '1px solid var(--border-muted)' }}>
                        <FiZap size={14} style={{ color: 'var(--primary)' }} />
                      </div>
                      <div>
                        <div className="text-[13px] font-medium" style={{ color: 'var(--text)' }}>Rate limit</div>
                        <div className="text-[11px]" style={{ color: 'var(--highlight)' }}>Maximum number of allowed requests</div>
                      </div>
                    </div>
                    {editingRateLimit ? (
                      <div className="flex items-center gap-2">
                        <input
                          autoFocus
                          value={editRateLimit}
                          onChange={(e) => setEditRateLimit(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') handleUpdateRateLimit(); if (e.key === 'Escape') setEditingRateLimit(false) }}
                          className="w-24 px-3 py-1.5 rounded-lg text-[13px] text-right"
                          style={{ background: 'var(--bg-dark)', border: '1px solid var(--primary)', color: 'var(--text)' }}
                        />
                        <button
                          onClick={handleUpdateRateLimit}
                          className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer"
                          style={{ background: 'var(--primary)', color: 'var(--bg-dark)', border: 'none' }}
                        >
                          <FiCheck size={13} />
                        </button>
                        <button
                          onClick={() => setEditingRateLimit(false)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer"
                          style={{ background: 'var(--bg-light)', border: '1px solid var(--border-muted)', color: 'var(--highlight)' }}
                        >
                          <FiX size={13} />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setEditingRateLimit(true); setEditRateLimit(String(selected.rate_limit)) }}
                        className="px-3.5 py-1.5 rounded-lg text-[13px] font-medium cursor-pointer transition-all duration-150"
                        style={{ background: 'var(--bg-light)', border: '1px solid var(--border-muted)', color: 'var(--text)' }}
                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--primary)' }}
                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-muted)' }}
                      >
                        {selected.rate_limit.toLocaleString()} requests
                      </button>
                    )}
                  </div>

                  {/* Status */}
                  <div
                    className="flex items-center justify-between px-5 py-4"
                    style={{ borderBottom: '1px solid var(--border-muted)' }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--bg-light)', border: '1px solid var(--border-muted)' }}>
                        <FiShield size={14} style={{ color: selected.enabled ? 'var(--success, #22c55e)' : 'var(--highlight)' }} />
                      </div>
                      <div>
                        <div className="text-[13px] font-medium" style={{ color: 'var(--text)' }}>Status</div>
                        <div className="text-[11px]" style={{ color: 'var(--highlight)' }}>Enable or disable the key without deleting it</div>
                      </div>
                    </div>
                    <button
                      onClick={handleToggle}
                      className="relative cursor-pointer"
                      style={{
                        width: 44,
                        height: 24,
                        borderRadius: 999,
                        background: selected.enabled ? 'var(--primary)' : 'var(--bg-light)',
                        border: '1px solid var(--border-muted)',
                        padding: 0,
                        transition: 'background 0.2s',
                      }}
                    >
                      <div
                        style={{
                          position: 'absolute',
                          top: 3,
                          left: selected.enabled ? 23 : 3,
                          width: 16,
                          height: 16,
                          borderRadius: '50%',
                          background: selected.enabled ? 'var(--bg-dark)' : 'var(--highlight)',
                          transition: 'left 0.2s',
                        }}
                      />
                    </button>
                  </div>

                </div>

                {/* Danger zone */}
                <div
                  className="rounded-xl"
                  style={{ background: 'var(--bg)', border: '1px solid rgba(239,68,68,0.2)' }}
                >
                  <div
                    className="flex items-center justify-between px-5 py-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(239,68,68,0.08)' }}>
                        <FiTrash2 size={14} style={{ color: 'var(--danger)' }} />
                      </div>
                      <div>
                        <div className="text-[13px] font-medium" style={{ color: 'var(--text)' }}>Delete key</div>
                        <div className="text-[11px]" style={{ color: 'var(--highlight)' }}>This action cannot be undone. All apps using this key will be disconnected.</div>
                      </div>
                    </div>
                    <button
                      onClick={() => setDeleteTarget({ id: selected.id, name: selected.name })}
                      className="px-3.5 py-1.5 rounded-lg text-[12px] font-semibold cursor-pointer transition-all duration-150 shrink-0"
                      style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--danger)', border: '1px solid rgba(239,68,68,0.2)' }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--danger)'; e.currentTarget.style.color = '#fff' }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; e.currentTarget.style.color = 'var(--danger)' }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          /* Empty state */
          <div className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center gap-4 text-center">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{ background: 'var(--bg-light)', border: '1px solid var(--border-muted)' }}
              >
                <MdKey size={28} style={{ color: 'var(--highlight)' }} />
              </div>
              <div>
                <h3 className="text-[16px] font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>
                  {keys.length === 0 ? 'No API keys' : 'Select a key'}
                </h3>
                <p className="text-[13px] max-w-xs" style={{ color: 'var(--highlight)' }}>
                  {keys.length === 0
                    ? 'Create an API key to integrate your agents and pipelines into your applications.'
                    : 'Choose a key from the list to view its stats and configuration.'}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ──── Create modal ──── */}
      {showCreate && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}>
          <div
            className="rounded-xl overflow-hidden"
            style={{ background: 'var(--bg)', border: '1px solid var(--border-muted)', boxShadow: '0 20px 60px rgba(0,0,0,0.5)', width: 420 }}
          >
            <div className="px-6 pt-6 pb-2 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'var(--primary-hover)', border: '1px solid var(--border)' }}>
                <MdKey size={16} style={{ color: 'var(--primary)' }} />
              </div>
              <div>
                <h3 className="text-[15px] font-semibold" style={{ color: 'var(--text)' }}>New API key</h3>
                <p className="text-[11px]" style={{ color: 'var(--highlight)' }}>Generate a key to access your agents via the API</p>
              </div>
              <button onClick={() => { setShowCreate(false); setCreateName(''); setCreateEntityId(''); setCreateVersion(null) }} className="ml-auto cursor-pointer" style={{ color: 'var(--highlight)', background: 'none', border: 'none' }}>
                <FiX size={18} />
              </button>
            </div>

            <div className="px-6 py-4 flex flex-col gap-3.5">
              {/* Name */}
              <div>
                <label className="text-[11px] font-medium mb-1 block" style={{ color: 'var(--text-muted)' }}>Name</label>
                <input
                  autoFocus
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  placeholder="Ex: Production, Test, Mon site..."
                  className="w-full px-3 py-2.5 rounded-lg text-[13px]"
                  style={{ background: 'var(--bg-light)', border: '1px solid var(--border-muted)', color: 'var(--text)' }}
                />
              </div>

              {/* Toggle Agent / Pipeline */}
              <div>
                <label className="text-[11px] font-medium mb-1.5 block" style={{ color: 'var(--text-muted)' }}>Type</label>
                <div
                  className="inline-flex rounded-lg p-0.5"
                  style={{ background: 'var(--bg-light)', border: '1px solid var(--border-muted)' }}
                >
                  {([
                    { value: 'agent' as const, label: 'Agent', icon: <RiRobot3Line size={13} /> },
                    { value: 'pipeline' as const, label: 'Pipeline', icon: <LuLayers size={13} /> },
                  ]).map((opt) => {
                    const active = createType === opt.value
                    return (
                      <button
                        key={opt.value}
                        onClick={() => { setCreateType(opt.value); setCreateEntityId(''); setCreateVersion(null) }}
                        className="flex items-center gap-1.5 px-4 py-1.5 rounded-md text-[12px] font-medium cursor-pointer transition-all duration-150"
                        style={{
                          background: active ? 'var(--bg)' : 'transparent',
                          color: active ? 'var(--text)' : 'var(--highlight)',
                          border: 'none',
                          boxShadow: active ? '0 1px 3px rgba(0,0,0,0.15)' : 'none',
                        }}
                      >
                        {opt.icon}
                        {opt.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Entity dropdown */}
              <div>
                <label className="text-[11px] font-medium mb-1 block" style={{ color: 'var(--text-muted)' }}>
                  {createType === 'agent' ? 'Agent' : 'Pipeline'}
                </label>
                <Dropdown
                  options={entities
                    .filter((e) => e.type === createType)
                    .map((e) => ({
                      value: e.id,
                      label: e.name,
                      icon: createType === 'agent'
                        ? <RiRobot3Line size={14} style={{ color: 'var(--primary)' }} />
                        : <LuLayers size={14} style={{ color: 'var(--info, #3b82f6)' }} />,
                    }))}
                  value={createEntityId}
                  onChange={(v) => { setCreateEntityId(v); setCreateVersion(null) }}
                  placeholder={`Select ${createType === 'agent' ? 'an agent' : 'a pipeline'}...`}
                  size="md"
                />
              </div>

              {/* Version dropdown */}
              {selectedEntity && selectedEntity.versions.length > 0 && (
                <div>
                  <label className="text-[11px] font-medium mb-1 block" style={{ color: 'var(--text-muted)' }}>
                    Version <span style={{ color: 'var(--highlight)' }}>(optionnel)</span>
                  </label>
                  <Dropdown
                    options={[
                      { value: '', label: `Current version (v${selectedEntity.current_version})` },
                      ...selectedEntity.versions.map((v) => ({
                        value: String(v.version),
                        label: `v${v.version}${v.label ? ` — ${v.label}` : ''}`,
                      })),
                    ]}
                    value={createVersion !== null ? String(createVersion) : ''}
                    onChange={(v) => setCreateVersion(v ? parseInt(v) : null)}
                    placeholder="Current version"
                    size="md"
                  />
                </div>
              )}
            </div>

            <div
              className="flex items-center gap-2.5 px-6 py-4"
              style={{ borderTop: '1px solid var(--border-muted)', background: 'var(--bg-light)' }}
            >
              <button
                onClick={() => { setShowCreate(false); setCreateName(''); setCreateEntityId(''); setCreateVersion(null) }}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-[12px] font-medium cursor-pointer"
                style={{ background: 'var(--bg)', border: '1px solid var(--border-muted)', color: 'var(--text-muted)' }}
              >
                <FiX size={13} />
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={!createName.trim() || !createEntityId}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-[12px] font-semibold cursor-pointer transition-all duration-150"
                style={{
                  background: !createName.trim() || !createEntityId ? 'var(--bg-light)' : 'var(--primary)',
                  color: !createName.trim() || !createEntityId ? 'var(--highlight)' : 'var(--bg-dark)',
                  border: 'none',
                  opacity: !createName.trim() || !createEntityId ? 0.5 : 1,
                }}
              >
                <MdKey size={13} />
                Generate key
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete modal */}
      {deleteTarget && (
        <DeleteModal
          title="Delete API key"
          name={deleteTarget.name}
          description={`The key "${deleteTarget.name}" will be revoked immediately. All applications using this key will no longer be able to access the API.`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}
