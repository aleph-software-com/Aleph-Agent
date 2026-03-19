import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import NavSidebar from '../components/layout/NavSidebar'
import ApiKeysPage from '../components/api/ApiKeysPage'

export default function ApiKeysPageWrapper() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const navigate = useNavigate()

  return (
    <div className="flex h-full w-full" style={{ background: 'var(--bg-dark)' }}>
      <NavSidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        activeRoute="api"
        onNavigate={(route) => navigate(`/${route}`)}
      />
      <ApiKeysPage />
    </div>
  )
}
