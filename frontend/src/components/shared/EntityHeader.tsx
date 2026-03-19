import { useState } from 'react'
import { FiEdit2, FiMessageCircle } from 'react-icons/fi'
import VersionDropdown, { type Version } from '../ui/VersionDropdown'

interface Tab {
  id: string
  label: string
  icon: React.ComponentType<{ size: number }>
}

interface EntityHeaderProps {
  name: string
  icon: React.ComponentType<{ size: number; style?: React.CSSProperties }>
  iconColor?: string
  tabs: Tab[]
  activeTab: string
  onTabChange: (tab: string) => void
  onChat: () => void
  onNameChange: (name: string) => void
  badge?: React.ReactNode
  versions: Version[]
  currentVersion: number
  onVersionSwitch: (version: number) => void
  onVersionCreate: (notes: string, label: string) => void
  onVersionUpdate: (version: number, notes: string, label: string) => void
}

export default function EntityHeader({
  name,
  icon: Icon,
  iconColor = 'var(--primary)',
  tabs,
  activeTab,
  onTabChange,
  onChat,
  onNameChange,
  badge,
  versions,
  currentVersion,
  onVersionSwitch,
  onVersionCreate,
  onVersionUpdate,
}: EntityHeaderProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState(name)

  const commitName = () => {
    setIsEditing(false)
    if (editName.trim() && editName !== name) onNameChange(editName.trim())
  }

  return (
    <header className="shrink-0" style={{ background: 'var(--bg)', borderBottom: '1px solid var(--border-muted)' }}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-8 h-16">
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'var(--primary-hover)', border: '1px solid var(--border)' }}
          >
            <Icon size={16} style={{ color: iconColor }} />
          </div>

          {isEditing ? (
            <input
              autoFocus
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={commitName}
              onKeyDown={(e) => { if (e.key === 'Enter') commitName() }}
              className="text-lg font-semibold px-2 py-1 rounded-md"
              style={{ background: 'var(--bg-light)', border: '1px solid var(--primary)', width: '260px' }}
            />
          ) : (
            <button onClick={() => setIsEditing(true)} className="flex items-center gap-2 group cursor-pointer">
              <h1 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>{editName}</h1>
              <FiEdit2
                size={13}
                className="opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                style={{ color: 'var(--highlight)' }}
              />
            </button>
          )}

          {badge}
        </div>

        <div className="flex items-center gap-2.5">
          <VersionDropdown
            versions={versions}
            currentVersion={currentVersion}
            onSwitch={onVersionSwitch}
            onCreate={onVersionCreate}
            onUpdateVersion={onVersionUpdate}
          />

          <button
            onClick={onChat}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-semibold transition-all duration-200 cursor-pointer"
            style={{ background: 'var(--primary)', color: 'var(--bg-dark)', border: 'none' }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.9' }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '1' }}
          >
            <FiMessageCircle size={14} />
            Chat
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-0 px-8">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className="relative px-4 py-3 text-[13px] font-medium transition-colors duration-200 cursor-pointer"
              style={{
                color: isActive ? 'var(--primary)' : 'var(--highlight)',
                background: 'transparent',
                border: 'none',
              }}
              onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.color = 'var(--text-muted)' }}
              onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.color = isActive ? 'var(--primary)' : 'var(--highlight)' }}
            >
              <span className="flex items-center gap-1.5">
                <tab.icon size={14} />
                {tab.label}
              </span>
              {isActive && (
                <div
                  className="absolute bottom-0 left-4 right-4 h-[2px] rounded-full"
                  style={{ background: 'var(--primary)' }}
                />
              )}
            </button>
          )
        })}
      </div>
    </header>
  )
}
