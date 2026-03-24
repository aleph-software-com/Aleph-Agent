import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import NavSidebar from '../components/layout/NavSidebar'
import PipelineList from '../components/pipeline/PipelineList'
import PipelineHeader from '../components/pipeline/PipelineHeader'
import PipelinePromptTab from '../components/pipeline/PipelinePromptTab'
import PipelineFlowTab from '../components/pipeline/flow'
import PipelineToolsTab from '../components/pipeline/PipelineToolsTab'
import ChatPage from '../components/chatesting/ChatPage'
import { LuLayers } from 'react-icons/lu'
import * as api from '../lib/api'
import type { Version } from '../components/ui/VersionDropdown'

const PAGE_SIZE = 20

function EmptyState() {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'var(--bg-light)', border: '1px solid var(--border-muted)' }}>
          <LuLayers size={28} style={{ color: 'var(--highlight)' }} />
        </div>
        <div>
          <h3 className="text-[16px] font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>Select a pipeline</h3>
          <p className="text-[13px] max-w-xs" style={{ color: 'var(--highlight)' }}>Choose a pipeline from the list or create a new one to get started.</p>
        </div>
      </div>
    </div>
  )
}

export default function PipelinesPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const segments = location.pathname.replace(/^\/pipelines\/?/, '').split('/').filter(Boolean)
  const id = segments[0] || undefined
  const tab = segments[1] || undefined

  const isChat = tab === 'chat'
  const activeTab = (!isChat && tab) || 'prompt'

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  const [pipelinesList, setPipelinesList] = useState<any[]>([])
  const [pipelinesHasMore, setPipelinesHasMore] = useState(false)
  const [pipelinesSearch, setPipelinesSearch] = useState('')

  const [pipelineFull, setPipelineFull] = useState<any | null>(null)
  const [agentsWithTools, setAgentsWithTools] = useState<any[]>([])

  const loadPipelines = useCallback(async (search?: string, cursor?: string) => {
    try {
      const results = await api.pipelines.list({ search: search || undefined, cursor, limit: PAGE_SIZE })
      if (cursor) {
        setPipelinesList((prev) => [...prev, ...results])
      } else {
        setPipelinesList(results)
      }
      setPipelinesHasMore(results.length >= PAGE_SIZE)
    } catch {}
  }, [])

  useEffect(() => { loadPipelines() }, [loadPipelines])

  // Auto-select first pipeline if none selected
  useEffect(() => {
    if (!id && pipelinesList.length > 0) {
      navigate(`/pipelines/${pipelinesList[0].id}`, { replace: true })
    }
  }, [id, pipelinesList, navigate])

  useEffect(() => {
    if (!id) { setPipelineFull(null); return }
    api.pipelines.getFull(id).then(setPipelineFull).catch(() => setPipelineFull(null))
  }, [id])

  // Load all agents with tools for pipeline flow
  useEffect(() => {
    api.agents.list().then((agents) =>
      Promise.all(agents.map((a: any) => api.agents.getFull(a.id)))
    ).then(setAgentsWithTools).catch(() => setAgentsWithTools([]))
  }, [])

  const handleCreate = async () => {
    const p = await api.pipelines.create({ name: 'New pipeline' })
    await loadPipelines(pipelinesSearch)
    navigate(`/pipelines/${p.id}`)
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
    await api.pipelines.switchVersion(id, version)
    api.pipelines.getFull(id).then(setPipelineFull)
  }

  const handleVersionCreate = async (notes: string, label: string) => {
    if (!id || !pipelineFull) return
    const snapshot = {
      description: pipelineFull.description ?? '',
      prompt: pipelineFull.prompt ?? '',
      flow_data: pipelineFull.flow_data ?? { nodes: [], edges: [] },
      tools: pipelineFull.tools ?? [],
    }
    await api.pipelines.createVersion(id, { notes, label, snapshot })
    api.pipelines.getFull(id).then(setPipelineFull)
  }

  const handleVersionUpdate = async (version: number, notes: string, label: string) => {
    if (!id) return
    await api.pipelines.updateVersion(id, version, { notes, label })
    api.pipelines.getFull(id).then(setPipelineFull)
  }

  const updatePipeline = async (data: any) => {
    if (!id || !pipelineFull) return
    const snapshotFields = ['description', 'prompt', 'flow_data', 'tools']
    const snapshotUpdate: any = {}
    const pipelineUpdate: any = {}
    for (const [k, v] of Object.entries(data)) {
      if (snapshotFields.includes(k)) {
        snapshotUpdate[k] = v
      } else {
        pipelineUpdate[k] = v
      }
    }

    if (Object.keys(pipelineUpdate).length > 0) {
      await api.pipelines.update(id, pipelineUpdate)
    }
    if (Object.keys(snapshotUpdate).length > 0) {
      const fullSnapshot = {
        description: pipelineFull.description ?? '',
        prompt: pipelineFull.prompt ?? '',
        flow_data: pipelineFull.flow_data ?? { nodes: [], edges: [] },
        tools: pipelineFull.tools ?? [],
        ...snapshotUpdate,
      }
      await api.pipelines.updateVersion(id, pipelineFull.current_version, { snapshot: fullSnapshot })
    }
    const newFull = await api.pipelines.getFull(id)
    setPipelineFull(newFull)
    loadPipelines(pipelinesSearch)
  }

  const selectedPipeline = pipelinesList.find((p) => p.id === id)

  if (isChat && id) {
    return (
      <ChatPage
        pipelineId={id}
        name={selectedPipeline?.name || ''}
        onBack={() => navigate(`/pipelines/${id}`)}
      />
    )
  }

  return (
    <div className="flex h-full w-full" style={{ background: 'var(--bg-dark)' }}>
      <NavSidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        activeRoute="pipelines"
        onNavigate={(route) => navigate(`/${route}`)}
      />

      <PipelineList
        pipelines={pipelinesList.map((p) => ({ id: p.id, name: p.name, status: 'draft' as const, color: 'var(--info)', created_at: p.created_at }))}
        selectedId={id || null}
        hasMore={pipelinesHasMore}
        onSelect={(pipelineId) => navigate(`/pipelines/${pipelineId}`)}
        onCreate={handleCreate}
        onDelete={async (pipelineId) => { await api.pipelines.remove(pipelineId); if (id === pipelineId) navigate('/pipelines'); loadPipelines(pipelinesSearch) }}
        onSearch={(q) => { setPipelinesSearch(q); loadPipelines(q) }}
        onLoadMore={() => {
          const last = pipelinesList[pipelinesList.length - 1]
          if (last?.created_at) loadPipelines(pipelinesSearch, last.created_at)
        }}
      />

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {selectedPipeline && pipelineFull ? (
          <>
            <PipelineHeader
              name={pipelineFull.name}
              activeTab={activeTab}
              onTabChange={(t) => navigate(`/pipelines/${id}/${t}`)}
              onChat={() => navigate(`/pipelines/${id}/chat`)}
              onNameChange={(name) => updatePipeline({ name })}
              versions={getVersions(pipelineFull)}
              currentVersion={pipelineFull.current_version ?? 1}
              onVersionSwitch={handleVersionSwitch}
              onVersionCreate={handleVersionCreate}
              onVersionUpdate={handleVersionUpdate}
            />
            {activeTab === 'flow' ? (
              <div className="flex-1 overflow-hidden" style={{ background: 'var(--bg-dark)' }}>
                <PipelineFlowTab key={pipelineFull.id} agents={agentsWithTools} tools={pipelineFull.tools || []} flowData={pipelineFull.flow_data} onFlowChange={(fd) => updatePipeline({ flow_data: fd })} />
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto p-8" style={{ background: 'var(--bg-dark)' }}>
                <div className="mx-auto w-full max-w-3xl h-full">
                  {activeTab === 'prompt' && <PipelinePromptTab prompt={pipelineFull.prompt} onUpdate={(prompt) => updatePipeline({ prompt })} />}
                  {activeTab === 'tools' && <PipelineToolsTab tools={pipelineFull.tools || []} onUpdateTools={(tools) => updatePipeline({ tools })} />}
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
