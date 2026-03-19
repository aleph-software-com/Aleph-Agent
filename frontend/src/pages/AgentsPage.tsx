import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import NavSidebar from '../components/layout/NavSidebar'
import AgentList from '../components/agent/AgentList'
import AgentHeader from '../components/agent/AgentHeader'
import ModelTab from '../components/agent/ModelTab'
import PromptTab from '../components/agent/PromptTab'
import TaskTab from '../components/agent/TaskTab'
import ToolsTab from '../components/agent/ToolsTab'
import ContextTab from '../components/agent/ContextTab'
import FlowTab from '../components/agent/flow'
import ChatPage from '../components/chatesting/ChatPage'
import { RiRobot3Line } from 'react-icons/ri'
import * as api from '../lib/api'
import type { Version } from '../components/ui/VersionDropdown'

const PAGE_SIZE = 20

function EmptyState() {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'var(--bg-light)', border: '1px solid var(--border-muted)' }}>
          <RiRobot3Line size={28} style={{ color: 'var(--highlight)' }} />
        </div>
        <div>
          <h3 className="text-[16px] font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>Select an agent</h3>
          <p className="text-[13px] max-w-xs" style={{ color: 'var(--highlight)' }}>Choose an agent from the list or create a new one to get started.</p>
        </div>
      </div>
    </div>
  )
}

export default function AgentsPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const segments = location.pathname.replace(/^\/agents\/?/, '').split('/').filter(Boolean)
  const id = segments[0] || undefined
  const tab = segments[1] || undefined

  const isChat = tab === 'chat'
  const activeTab = (!isChat && tab) || 'model'

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  const [agentsList, setAgentsList] = useState<any[]>([])
  const [agentsHasMore, setAgentsHasMore] = useState(false)
  const [agentsSearch, setAgentsSearch] = useState('')

  const [agentFull, setAgentFull] = useState<any | null>(null)

  const loadAgents = useCallback(async (search?: string, cursor?: string) => {
    try {
      const results = await api.agents.list({ search: search || undefined, cursor, limit: PAGE_SIZE })
      if (cursor) {
        setAgentsList((prev) => [...prev, ...results])
      } else {
        setAgentsList(results)
      }
      setAgentsHasMore(results.length >= PAGE_SIZE)
    } catch {}
  }, [])

  useEffect(() => { loadAgents() }, [loadAgents])

  useEffect(() => {
    if (!id) { setAgentFull(null); return }
    api.agents.getFull(id).then(setAgentFull).catch(() => setAgentFull(null))
  }, [id])

  const handleCreate = async () => {
    const a = await api.agents.create({ name: 'New agent' })
    await loadAgents(agentsSearch)
    navigate(`/agents/${a.id}`)
  }

  const getVersions = (full: any): Version[] => {
    if (!full?.versions) return []
    return full.versions.map((v: any) => ({
      version: v.version,
      label: v.label || '',
      notes: v.notes || '',
      createdAt: v.created_at,
    }))
  }

  const handleVersionSwitch = async (version: number) => {
    if (!id) return
    await api.agents.switchVersion(id, version)
    api.agents.getFull(id).then(setAgentFull)
  }

  const handleVersionCreate = async (notes: string, label: string) => {
    if (!id || !agentFull) return
    const snapshot = {
      description: agentFull.description ?? '',
      system_prompt: agentFull.system_prompt ?? '',
      llm_provider: agentFull.llm_provider ?? 'openai',
      llm_model: agentFull.llm_model ?? 'gpt-4o',
      llm_config: agentFull.llm_config ?? {},
      tts_provider: agentFull.tts_provider ?? null,
      tts_model: agentFull.tts_model ?? null,
      tts_config: agentFull.tts_config ?? {},
      stt_provider: agentFull.stt_provider ?? null,
      stt_model: agentFull.stt_model ?? null,
      stt_config: agentFull.stt_config ?? {},
      flow_data: agentFull.flow_data ?? { nodes: [], edges: [] },
      tasks: agentFull.tasks ?? [],
      tools: agentFull.tools ?? [],
    }
    await api.agents.createVersion(id, { notes, label, snapshot })
    api.agents.getFull(id).then(setAgentFull)
  }

  const handleVersionUpdate = async (version: number, notes: string, label: string) => {
    if (!id) return
    await api.agents.updateVersion(id, version, { notes, label })
    api.agents.getFull(id).then(setAgentFull)
  }

  const updateAgent = async (data: any) => {
    if (!id || !agentFull) return
    const snapshotFields = ['description', 'system_prompt', 'llm_provider', 'llm_model', 'llm_config', 'tts_provider', 'tts_model', 'tts_config', 'stt_provider', 'stt_model', 'stt_config', 'flow_data', 'tasks', 'tools']
    const snapshotUpdate: any = {}
    const agentUpdate: any = {}
    for (const [k, v] of Object.entries(data)) {
      if (snapshotFields.includes(k)) {
        snapshotUpdate[k] = v
      } else {
        agentUpdate[k] = v
      }
    }

    if (Object.keys(agentUpdate).length > 0) {
      await api.agents.update(id, agentUpdate)
    }
    if (Object.keys(snapshotUpdate).length > 0) {
      const fullSnapshot = {
        description: agentFull.description ?? '',
        system_prompt: agentFull.system_prompt ?? '',
        llm_provider: agentFull.llm_provider ?? 'openai',
        llm_model: agentFull.llm_model ?? 'gpt-4o',
        llm_config: agentFull.llm_config ?? {},
        tts_provider: agentFull.tts_provider ?? null,
        tts_model: agentFull.tts_model ?? null,
        tts_config: agentFull.tts_config ?? {},
        stt_provider: agentFull.stt_provider ?? null,
        stt_model: agentFull.stt_model ?? null,
        stt_config: agentFull.stt_config ?? {},
        flow_data: agentFull.flow_data ?? { nodes: [], edges: [] },
        tasks: agentFull.tasks ?? [],
        tools: agentFull.tools ?? [],
        ...snapshotUpdate,
      }
      await api.agents.updateVersion(id, agentFull.current_version, { snapshot: fullSnapshot })
    }
    const newFull = await api.agents.getFull(id)
    setAgentFull(newFull)
    loadAgents(agentsSearch)
  }

  const selectedAgent = agentsList.find((a) => a.id === id)

  if (isChat && id) {
    return (
      <ChatPage
        agentId={id}
        name={selectedAgent?.name || ''}
        onBack={() => navigate(`/agents/${id}`)}
      />
    )
  }

  return (
    <div className="flex h-full w-full" style={{ background: 'var(--bg-dark)' }}>
      <NavSidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        activeRoute="agents"
        onNavigate={(route) => navigate(`/${route}`)}
      />

      <AgentList
        agents={agentsList.map((a) => ({ id: a.id, name: a.name, status: 'draft' as const, color: 'var(--primary)', created_at: a.created_at }))}
        selectedId={id || null}
        hasMore={agentsHasMore}
        onSelect={(agentId) => navigate(`/agents/${agentId}`)}
        onCreate={handleCreate}
        onDelete={async (agentId) => { await api.agents.remove(agentId); if (id === agentId) navigate('/agents'); loadAgents(agentsSearch) }}
        onSearch={(q) => { setAgentsSearch(q); loadAgents(q) }}
        onLoadMore={() => {
          const last = agentsList[agentsList.length - 1]
          if (last?.created_at) loadAgents(agentsSearch, last.created_at)
        }}
      />

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {selectedAgent && agentFull ? (
          <>
            <AgentHeader
              name={agentFull.name}
              activeTab={activeTab}
              onTabChange={(t) => navigate(`/agents/${id}/${t}`)}
              onChat={() => navigate(`/agents/${id}/chat`)}
              onNameChange={(name) => updateAgent({ name })}
              versions={getVersions(agentFull)}
              currentVersion={agentFull.current_version ?? 1}
              onVersionSwitch={handleVersionSwitch}
              onVersionCreate={handleVersionCreate}
              onVersionUpdate={handleVersionUpdate}
            />
            {activeTab === 'flow' ? (
              <div className="flex-1 overflow-hidden" style={{ background: 'var(--bg-dark)' }}>
                <FlowTab key={agentFull.id} agentName={agentFull.name} tasks={(agentFull.tasks || []).map((t: any) => ({ id: t.id, name: t.name }))} tools={(agentFull.tools || []).map((t: any) => ({ id: t.id, name: t.name, type: t.type, config: t.config }))} flowData={agentFull.flow_data} onFlowChange={(fd) => updateAgent({ flow_data: fd })} />
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto p-8" style={{ background: 'var(--bg-dark)' }}>
                <div className="mx-auto w-full max-w-3xl h-full">
                  {activeTab === 'model' && <ModelTab agent={agentFull} onUpdate={updateAgent} />}
                  {activeTab === 'prompt' && <PromptTab prompt={agentFull.system_prompt} onUpdate={(system_prompt) => updateAgent({ system_prompt })} />}
                  {activeTab === 'task' && <TaskTab tasks={agentFull.tasks || []} allTools={agentFull.tools || []} onUpdateTasks={(tasks) => updateAgent({ tasks })} />}
                  {activeTab === 'tools' && <ToolsTab tools={agentFull.tools || []} allTools={agentFull.tools || []} onUpdateTools={(tools) => updateAgent({ tools })} />}
                  {activeTab === 'context' && <ContextTab agent={agentFull} onUpdate={updateAgent} />}
                </div>
              </div>
            )}
          </>
        ) : (
          <EmptyState />
        )}
      </main>
    </div>
  )
}
