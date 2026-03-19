import {
  FiBook,
  FiSun,
  FiMoon,
} from 'react-icons/fi'
import { LuPanelLeft, LuLayers } from 'react-icons/lu'
import { RiRobot3Line } from 'react-icons/ri'
import { MdKey } from 'react-icons/md'
import { useTheme } from '../../contexts/ThemeContext'

const navItems = [
  { icon: FiBook, label: 'Doc', id: 'doc' },
  { icon: RiRobot3Line, label: 'Agents', id: 'agents' },
  { icon: LuLayers, label: 'Pipelines', id: 'pipelines' },
  { icon: MdKey, label: 'API Keys', id: 'api' },
]

interface NavSidebarProps {
  collapsed: boolean
  onToggle: () => void
  activeRoute: string
  onNavigate: (route: string) => void
}

function ThemeToggle({ collapsed }: { collapsed: boolean }) {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'
  const Icon = isDark ? FiSun : FiMoon

  return (
    <button
      onClick={toggleTheme}
      className="group relative flex items-center gap-3 rounded-lg transition-all duration-200 cursor-pointer w-full"
      style={{
        padding: collapsed ? '10px 0' : '10px 12px',
        justifyContent: collapsed ? 'center' : 'flex-start',
        background: 'transparent',
        color: 'var(--highlight)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'var(--bg)'
        e.currentTarget.style.color = 'var(--text-muted)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent'
        e.currentTarget.style.color = 'var(--highlight)'
      }}
    >
      <Icon size={18} className="shrink-0" />
      {!collapsed && (
        <span className="text-[13px] font-medium whitespace-nowrap">{isDark ? 'Light mode' : 'Dark mode'}</span>
      )}
      {collapsed && (
        <div
          className="absolute left-full ml-2 px-2.5 py-1.5 rounded-md text-xs font-medium whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-200 z-50"
          style={{
            background: 'var(--bg-light)',
            color: 'var(--text)',
            border: '1px solid var(--border)',
          }}
        >
          {isDark ? 'Light mode' : 'Dark mode'}
        </div>
      )}
    </button>
  )
}

export default function NavSidebar({
  collapsed,
  onToggle,
  activeRoute,
  onNavigate,
}: NavSidebarProps) {
  return (
    <nav
      className="relative flex flex-col h-full shrink-0 overflow-hidden transition-all duration-300 ease-in-out"
      style={{
        width: collapsed ? 64 : 220,
        background: 'var(--bg-dark)',
        borderRight: '1px solid var(--border-muted)',
      }}
    >
      {/* Logo / Toggle */}
      <div
        className="flex items-center h-14 px-4 shrink-0"
        style={{ borderBottom: '1px solid var(--border-muted)' }}
      >
        {!collapsed && (
          <div className="flex items-center gap-2.5 overflow-hidden">
            <img src="/favicon.svg" alt="Aleph Agent" className="w-7 h-7 shrink-0" />
            <span className="text-sm font-semibold whitespace-nowrap" style={{ color: 'var(--text)' }}>
              Aleph <span style={{ color: 'var(--accent-hover)' }}>Agent</span>
            </span>
          </div>
        )}
        <button
          onClick={onToggle}
          className="flex items-center justify-center w-8 h-8 rounded-md transition-all duration-200 cursor-pointer ml-auto"
          style={{ color: 'var(--highlight)' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--bg)'
            e.currentTarget.style.color = 'var(--text)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent'
            e.currentTarget.style.color = 'var(--highlight)'
          }}
        >
          <LuPanelLeft size={16} />
        </button>
      </div>

      {/* Main Nav Items */}
      <div className="flex-1 flex flex-col gap-0.5 px-2.5 py-3 overflow-x-hidden overflow-y-auto">
        {navItems.map((item) => {
          const isActive = activeRoute === item.id
          const Icon = item.icon
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className="group relative flex items-center gap-3 rounded-lg transition-all duration-200 cursor-pointer"
              style={{
                padding: collapsed ? '10px 0' : '10px 12px',
                justifyContent: collapsed ? 'center' : 'flex-start',
                background: isActive ? 'var(--bg-light)' : 'transparent',
                color: isActive ? 'var(--primary)' : 'var(--highlight)',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'var(--bg)'
                  e.currentTarget.style.color = 'var(--text-muted)'
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.color = 'var(--highlight)'
                }
              }}
            >
              {isActive && (
                <div
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full"
                  style={{ background: 'var(--primary)' }}
                />
              )}
              <Icon size={18} className="shrink-0" />
              {!collapsed && (
                <span className="text-[13px] font-medium whitespace-nowrap">{item.label}</span>
              )}
              {collapsed && (
                <div
                  className="absolute left-full ml-2 px-2.5 py-1.5 rounded-md text-xs font-medium whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-200 z-50"
                  style={{
                    background: 'var(--bg-light)',
                    color: 'var(--text)',
                    border: '1px solid var(--border)',
                  }}
                >
                  {item.label}
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* Bottom section */}
      <div
        className="flex flex-col gap-0.5 px-2.5 py-3 shrink-0"
        style={{ borderTop: '1px solid var(--border-muted)' }}
      >
        <ThemeToggle collapsed={collapsed} />
      </div>
    </nav>
  )
}
