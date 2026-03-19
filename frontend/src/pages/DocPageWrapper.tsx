import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import NavSidebar from '../components/layout/NavSidebar'
import DocPage from '../components/doc/DocPage'

export default function DocPageWrapper() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const navigate = useNavigate()

  return (
    <div className="flex h-full w-full" style={{ background: 'var(--bg-dark)' }}>
      <NavSidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        activeRoute="doc"
        onNavigate={(route) => navigate(`/${route}`)}
      />
      <DocPage />
    </div>
  )
}
