import { useState, useRef, useEffect } from 'react'
import { FiChevronDown, FiCheck, FiPlus, FiEdit3 } from 'react-icons/fi'
import { LuGitCommitVertical } from 'react-icons/lu'

export interface Version {
  version: number
  label: string
  notes: string
  createdAt: string
}

interface VersionDropdownProps {
  versions: Version[]
  currentVersion: number
  onSwitch: (version: number) => void
  onCreate: (notes: string, label: string) => void
  onUpdateVersion: (version: number, notes: string, label: string) => void
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export default function VersionDropdown({ versions, currentVersion, onSwitch, onCreate, onUpdateVersion }: VersionDropdownProps) {
  const [open, setOpen] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [newNotes, setNewNotes] = useState('')
  const [newLabel, setNewLabel] = useState('')
  const [editingVersion, setEditingVersion] = useState<number | null>(null)
  const [editNotes, setEditNotes] = useState('')
  const [editLabel, setEditLabel] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  const current = versions.find((v) => v.version === currentVersion)

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        setShowCreate(false)
        setEditingVersion(null)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  const handleCreate = () => {
    onCreate(newNotes, newLabel)
    setNewNotes('')
    setNewLabel('')
    setShowCreate(false)
    setOpen(false)
  }

  const startEdit = (v: Version) => {
    setEditingVersion(v.version)
    setEditNotes(v.notes)
    setEditLabel(v.label)
  }

  const commitEdit = () => {
    if (editingVersion !== null) {
      onUpdateVersion(editingVersion, editNotes, editLabel)
      setEditingVersion(null)
    }
  }

  return (
    <div ref={ref} className="relative">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-[13px] font-medium transition-all duration-200 cursor-pointer"
        style={{
          background: 'var(--bg-light)',
          border: open ? '1px solid var(--primary)' : '1px solid var(--border)',
          color: 'var(--text-muted)',
        }}
        onMouseEnter={(e) => { if (!open) e.currentTarget.style.color = 'var(--text)' }}
        onMouseLeave={(e) => { if (!open) e.currentTarget.style.color = 'var(--text-muted)' }}
      >
        <LuGitCommitVertical size={14} style={{ color: 'var(--primary)' }} />
        <span>v{currentVersion}</span>
        {current?.label && (
          <span
            className="text-[11px] px-1.5 py-0.5 rounded-md font-medium"
            style={{ background: 'var(--primary-hover)', color: 'var(--primary)' }}
          >
            {current.label}
          </span>
        )}
        <FiChevronDown
          size={13}
          className="shrink-0 transition-transform duration-200"
          style={{ color: 'var(--highlight)', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
        />
      </button>

      {/* Menu */}
      {open && (
        <div
          className="absolute right-0 top-full mt-1 z-50 rounded-xl overflow-hidden"
          style={{
            width: 320,
            background: 'var(--bg)',
            border: '1px solid var(--border-muted)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          }}
        >
          {/* Header */}
          <div
            className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider"
            style={{ color: 'var(--highlight)', borderBottom: '1px solid var(--border-muted)' }}
          >
            Versions ({versions.length})
          </div>

          {/* Version list */}
          <div style={{ maxHeight: 280, overflowY: 'auto' }}>
            {[...versions].reverse().map((v) => {
              const isActive = v.version === currentVersion
              const isEditing = editingVersion === v.version

              if (isEditing) {
                return (
                  <div
                    key={v.version}
                    className="px-4 py-3 flex flex-col gap-2"
                    style={{ background: 'var(--bg-light)', borderBottom: '1px solid var(--border-muted)' }}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-[11px] font-bold"
                        style={{ background: 'var(--primary)', color: 'var(--bg-dark)' }}
                      >
                        {v.version}
                      </div>
                      <span className="text-[12px] font-semibold" style={{ color: 'var(--text)' }}>
                        Edit v{v.version}
                      </span>
                    </div>
                    <input
                      value={editLabel}
                      onChange={(e) => setEditLabel(e.target.value)}
                      placeholder="Label (optional)"
                      className="px-2.5 py-1.5 rounded-lg text-[12px]"
                      style={{ background: 'var(--bg)', border: '1px solid var(--border-muted)' }}
                    />
                    <textarea
                      autoFocus
                      value={editNotes}
                      onChange={(e) => setEditNotes(e.target.value)}
                      placeholder="Notes..."
                      rows={2}
                      className="px-2.5 py-1.5 rounded-lg text-[12px] resize-none"
                      style={{ background: 'var(--bg)', border: '1px solid var(--border-muted)' }}
                    />
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setEditingVersion(null)}
                        className="flex-1 py-1.5 rounded-lg text-[11px] font-medium cursor-pointer"
                        style={{ background: 'var(--bg)', border: '1px solid var(--border-muted)', color: 'var(--text-muted)' }}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={commitEdit}
                        className="flex-1 py-1.5 rounded-lg text-[11px] font-semibold cursor-pointer"
                        style={{ background: 'var(--primary)', color: 'var(--bg-dark)', border: 'none' }}
                        onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.9' }}
                        onMouseLeave={(e) => { e.currentTarget.style.opacity = '1' }}
                      >
                        Save
                      </button>
                    </div>
                  </div>
                )
              }

              return (
                <div
                  key={v.version}
                  onClick={() => {
                    if (!isActive) {
                      onSwitch(v.version)
                      setOpen(false)
                    }
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors duration-100 group"
                  style={{
                    background: isActive ? 'var(--primary-hover)' : 'transparent',
                    borderBottom: '1px solid var(--border-muted)',
                    cursor: isActive ? 'default' : 'pointer',
                  }}
                  onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = 'var(--bg-light)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = isActive ? 'var(--primary-hover)' : 'transparent' }}
                >
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-[11px] font-bold"
                    style={{
                      background: isActive ? 'var(--primary)' : 'var(--bg-light)',
                      color: isActive ? 'var(--bg-dark)' : 'var(--highlight)',
                      border: isActive ? 'none' : '1px solid var(--border-muted)',
                    }}
                  >
                    {v.version}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[13px] font-medium" style={{ color: isActive ? 'var(--text)' : 'var(--text-muted)' }}>
                        v{v.version}
                      </span>
                      {v.label && (
                        <span
                          className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                          style={{ background: 'var(--bg-light)', color: 'var(--highlight)', border: '1px solid var(--border-muted)' }}
                        >
                          {v.label}
                        </span>
                      )}
                    </div>
                    {v.notes && (
                      <div className="text-[11px] truncate mt-0.5" style={{ color: 'var(--highlight)' }}>
                        {v.notes}
                      </div>
                    )}
                  </div>

                  <div className="shrink-0 flex items-center gap-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); startEdit(v) }}
                      className="w-6 h-6 rounded flex items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                      style={{ color: 'var(--highlight)' }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--primary)' }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--highlight)' }}
                    >
                      <FiEdit3 size={12} />
                    </button>
                    {isActive ? (
                      <FiCheck size={14} style={{ color: 'var(--primary)' }} />
                    ) : (
                      <span className="text-[10px]" style={{ color: 'var(--highlight)' }}>
                        {timeAgo(v.createdAt)}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Create new version */}
          {!showCreate ? (
            <button
              onClick={() => setShowCreate(true)}
              className="w-full flex items-center gap-2 px-4 py-3 text-[13px] font-medium cursor-pointer transition-colors duration-100"
              style={{
                background: 'transparent',
                border: 'none',
                borderTop: '1px solid var(--border-muted)',
                color: 'var(--primary)',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-light)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
            >
              <FiPlus size={14} />
              New version
            </button>
          ) : (
            <div
              className="px-4 py-3 flex flex-col gap-2.5"
              style={{ borderTop: '1px solid var(--border-muted)', background: 'var(--bg-light)' }}
            >
              <div className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--highlight)' }}>
                Create v{versions.length + 1}
              </div>
              <input
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="Label (optional)"
                className="px-2.5 py-1.5 rounded-lg text-[12px]"
                style={{ background: 'var(--bg)', border: '1px solid var(--border-muted)' }}
              />
              <textarea
                autoFocus
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                placeholder="Notes..."
                rows={2}
                className="px-2.5 py-1.5 rounded-lg text-[12px] resize-none"
                style={{ background: 'var(--bg)', border: '1px solid var(--border-muted)' }}
              />
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setShowCreate(false); setNewNotes(''); setNewLabel('') }}
                  className="flex-1 py-1.5 rounded-lg text-[11px] font-medium cursor-pointer"
                  style={{ background: 'var(--bg)', border: '1px solid var(--border-muted)', color: 'var(--text-muted)' }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreate}
                  className="flex-1 py-1.5 rounded-lg text-[11px] font-semibold cursor-pointer"
                  style={{ background: 'var(--primary)', color: 'var(--bg-dark)', border: 'none' }}
                  onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.9' }}
                  onMouseLeave={(e) => { e.currentTarget.style.opacity = '1' }}
                >
                  Create v{versions.length + 1}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
