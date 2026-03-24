import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { FiTool, FiPlus, FiSearch, FiTrash2, FiX, FiCheck, FiGlobe, FiFileText, FiPhoneForwarded } from 'react-icons/fi'
import Dropdown from '../ui/Dropdown'
import DeleteModal from '../ui/DeleteModal'
import { computeAvailableVariables, groupVariablesBySource } from '../../lib/variables'

// ── Types ──

type ToolType = 'http' | 'extraction' | 'handoff'
type ValueMode = 'variable' | 'fixed' | 'llm'

interface HeaderEntry { key: string; value: string }
interface BodyField { key: string; value_mode: ValueMode; variable_id?: string; fixed_value?: string; description?: string; field_type?: string }
interface ExtractionField { name: string; type: string; description: string }

const defaultConfigs: Record<ToolType, any> = {
  http: { method: 'GET', url: '', headers: [], body_fields: [] },
  extraction: { fields: [] },
  handoff: { target_type: 'human', transfer_message: '', context_options: ['none'] },
}

const httpMethodOptions = [
  { value: 'GET', label: 'GET' },
  { value: 'POST', label: 'POST' },
  { value: 'PUT', label: 'PUT' },
  { value: 'PATCH', label: 'PATCH' },
  { value: 'DELETE', label: 'DELETE' },
]

const extractionTypeOptions = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'boolean', label: 'Yes/No' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'date', label: 'Date' },
]

const typeColors: Record<ToolType, string> = {
  http: '#fb923c',
  extraction: '#34d399',
  handoff: '#f472b6',
}

const typeLabels: Record<ToolType, string> = {
  http: 'HTTP',
  extraction: 'Extraction',
  handoff: 'Handoff',
}

const methodColors: Record<string, string> = {
  GET: '#fb923c', POST: '#fb923c', PUT: '#fb923c', PATCH: '#fb923c', DELETE: '#fb923c',
}

// ── Tool Type Selector ──

function ToolTypeSelector({ value, onChange }: { value: ToolType; onChange: (t: ToolType) => void }) {
  const types: { type: ToolType; icon: typeof FiGlobe; label: string; desc: string }[] = [
    { type: 'http', icon: FiGlobe, label: 'HTTP Request', desc: 'Call an API' },
    { type: 'extraction', icon: FiFileText, label: 'Extraction', desc: 'Extract data' },
    { type: 'handoff', icon: FiPhoneForwarded, label: 'Handoff', desc: 'Transfer conversation' },
  ]
  return (
    <div className="grid grid-cols-3 gap-2">
      {types.map(({ type, icon: Icon, label, desc }) => {
        const active = value === type
        return (
          <button
            key={type}
            onClick={() => onChange(type)}
            className="flex flex-col items-center gap-1.5 p-3 rounded-lg transition-all duration-200 cursor-pointer"
            style={{
              background: active ? 'var(--primary-hover)' : 'var(--bg-light)',
              border: `1px solid ${active ? typeColors[type] : 'var(--border-muted)'}`,
            }}
            onMouseEnter={(e) => { if (!active) e.currentTarget.style.borderColor = 'var(--border)' }}
            onMouseLeave={(e) => { if (!active) e.currentTarget.style.borderColor = active ? typeColors[type] : 'var(--border-muted)' }}
          >
            <Icon size={16} style={{ color: active ? typeColors[type] : 'var(--highlight)' }} />
            <span className="text-[11px] font-semibold" style={{ color: active ? 'var(--text)' : 'var(--text-muted)' }}>{label}</span>
            <span className="text-[10px]" style={{ color: 'var(--highlight)' }}>{desc}</span>
          </button>
        )
      })}
    </div>
  )
}

// ── Variable Dropdown (grouped) ──

function VariableDropdown({ value, onChange, allTools }: { value: string; onChange: (v: string) => void; allTools: any[] }) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0, width: 0 })
  const variables = computeAvailableVariables(allTools)
  const groups = groupVariablesBySource(variables)
  const selected = variables.find((v) => v.id === value)

  useEffect(() => {
    if (!open) return
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      setMenuPos({ top: rect.bottom + 4, left: rect.left, width: rect.width })
    }
    function handleClick(e: MouseEvent) {
      if (triggerRef.current?.contains(e.target as Node) || menuRef.current?.contains(e.target as Node)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-[12px] font-medium cursor-pointer"
        style={{ background: 'var(--bg-light)', border: open ? '1px solid var(--primary)' : '1px solid var(--border-muted)', color: selected ? 'var(--text)' : 'var(--highlight)' }}
      >
        <span className="truncate">{selected ? `${selected.group} → ${selected.label}` : 'Choose a variable...'}</span>
        <FiSearch size={12} style={{ color: 'var(--highlight)', flexShrink: 0 }} />
      </button>
      {open && createPortal(
        <div
          ref={menuRef}
          className="rounded-xl py-1"
          style={{ position: 'fixed', top: menuPos.top, left: menuPos.left, width: menuPos.width, zIndex: 99999, pointerEvents: 'auto', background: 'var(--bg)', border: '1px solid var(--border-muted)', boxShadow: '0 8px 32px rgba(0,0,0,0.18)', maxHeight: 220, overflowY: 'auto' }}
        >
          {groups.length === 0 && (
            <div className="px-3 py-3 text-[11px] text-center" style={{ color: 'var(--highlight)' }}>No variables available</div>
          )}
          {groups.map(({ group, items }) => (
            <div key={group}>
              <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--highlight)' }}>{group}</div>
              {items.map((v) => (
                <button
                  key={v.id}
                  onClick={() => { onChange(v.id); setOpen(false) }}
                  className="w-full text-left px-4 py-1.5 text-[12px] font-medium cursor-pointer transition-colors duration-100"
                  style={{ background: v.id === value ? 'var(--primary-hover)' : 'transparent', border: 'none', color: v.id === value ? 'var(--text)' : 'var(--text-muted)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-light)'; e.currentTarget.style.color = 'var(--text)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = v.id === value ? 'var(--primary-hover)' : 'transparent'; e.currentTarget.style.color = v.id === value ? 'var(--text)' : 'var(--text-muted)' }}
                >
                  {v.label}
                </button>
              ))}
            </div>
          ))}
        </div>,
        document.getElementById('portal-root') || document.body,
      )}
    </div>
  )
}

// ── Value Mode Selector (3 tabs) ──

function ValueModeSelector({ value, onChange }: { value: ValueMode; onChange: (m: ValueMode) => void }) {
  const modes: { mode: ValueMode; label: string }[] = [
    { mode: 'variable', label: 'Variables' },
    { mode: 'fixed', label: 'Fixed value' },
    { mode: 'llm', label: 'Agent context' },
  ]
  return (
    <div className="flex gap-1">
      {modes.map(({ mode, label }) => (
        <button
          key={mode}
          onClick={() => onChange(mode)}
          className="px-2 py-1 rounded text-[10px] font-medium cursor-pointer transition-all duration-150"
          style={{
            background: value === mode ? 'var(--primary-hover)' : 'var(--bg-light)',
            border: `1px solid ${value === mode ? 'var(--primary)' : 'var(--border-muted)'}`,
            color: value === mode ? 'var(--text)' : 'var(--highlight)',
          }}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

// ── HTTP Form ──

function HttpForm({ config, onChange, allTools }: { config: any; onChange: (c: any) => void; allTools: any[] }) {
  const headers: HeaderEntry[] = config.headers || []
  const bodyFields: BodyField[] = config.body_fields || []
  const showBody = config.method !== 'GET'

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-[1fr_2fr] gap-3">
        <Dropdown options={httpMethodOptions} value={config.method || 'GET'} onChange={(m) => onChange({ ...config, method: m })} size="sm" />
        <input
          value={config.url || ''}
          onChange={(e) => onChange({ ...config, url: e.target.value })}
          placeholder="https://api.example.com/endpoint"
          className="text-[13px] font-mono px-3 py-2 rounded-lg"
          style={{ background: 'var(--bg-light)', border: '1px solid var(--border-muted)', color: 'var(--text)', outline: 'none' }}
        />
      </div>

      {/* Headers */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium uppercase tracking-wider" style={{ color: 'var(--highlight)' }}>Headers</span>
          <button onClick={() => onChange({ ...config, headers: [...headers, { key: '', value: '' }] })} className="text-[10px] font-medium px-2 py-0.5 rounded cursor-pointer" style={{ background: 'var(--bg-light)', border: '1px solid var(--border-muted)', color: 'var(--highlight)' }}>
            <FiPlus size={10} style={{ display: 'inline', verticalAlign: 'middle' }} /> Add
          </button>
        </div>
        {headers.map((h, idx) => (
          <div key={idx} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center">
            <input
              value={h.key}
              onChange={(e) => { const upd = [...headers]; upd[idx] = { ...upd[idx], key: e.target.value }; onChange({ ...config, headers: upd }) }}
              placeholder="Content-Type"
              className="text-[12px] font-mono px-2.5 py-1.5 rounded-lg"
              style={{ background: 'var(--bg-light)', border: '1px solid var(--border-muted)', color: 'var(--text)', outline: 'none' }}
            />
            <input
              value={h.value}
              onChange={(e) => { const upd = [...headers]; upd[idx] = { ...upd[idx], value: e.target.value }; onChange({ ...config, headers: upd }) }}
              placeholder="application/json"
              className="text-[12px] font-mono px-2.5 py-1.5 rounded-lg"
              style={{ background: 'var(--bg-light)', border: '1px solid var(--border-muted)', color: 'var(--text)', outline: 'none' }}
            />
            <button onClick={() => onChange({ ...config, headers: headers.filter((_, i) => i !== idx) })} className="w-6 h-6 rounded flex items-center justify-center cursor-pointer" style={{ color: 'var(--highlight)' }} onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--danger)' }} onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--highlight)' }}>
              <FiTrash2 size={11} />
            </button>
          </div>
        ))}
      </div>

      {/* Body Fields */}
      {showBody && (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium uppercase tracking-wider" style={{ color: 'var(--highlight)' }}>Data to send</span>
            <button onClick={() => onChange({ ...config, body_fields: [...bodyFields, { key: '', value_mode: 'llm', description: '', field_type: 'string' }] })} className="text-[10px] font-medium px-2 py-0.5 rounded cursor-pointer" style={{ background: 'var(--bg-light)', border: '1px solid var(--border-muted)', color: 'var(--highlight)' }}>
              <FiPlus size={10} style={{ display: 'inline', verticalAlign: 'middle' }} /> Add
            </button>
          </div>
          {bodyFields.map((bf, idx) => (
            <div key={idx} className="rounded-lg p-3 flex flex-col gap-2" style={{ background: 'var(--bg-light)', border: '1px solid var(--border-muted)' }}>
              <div className="flex items-center gap-2">
                <input
                  value={bf.key}
                  onChange={(e) => { const upd = [...bodyFields]; upd[idx] = { ...upd[idx], key: e.target.value }; onChange({ ...config, body_fields: upd }) }}
                  placeholder="API field name (e.g. customer_email)"
                  className="flex-1 text-[12px] font-mono px-2.5 py-1.5 rounded-lg"
                  style={{ background: 'var(--bg)', border: '1px solid var(--border-muted)', color: 'var(--text)', outline: 'none' }}
                />
                <button onClick={() => onChange({ ...config, body_fields: bodyFields.filter((_, i) => i !== idx) })} className="w-6 h-6 rounded flex items-center justify-center cursor-pointer shrink-0" style={{ color: 'var(--highlight)' }} onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--danger)' }} onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--highlight)' }}>
                  <FiTrash2 size={11} />
                </button>
              </div>
              <ValueModeSelector value={bf.value_mode} onChange={(m) => { const upd = [...bodyFields]; upd[idx] = { ...upd[idx], value_mode: m }; onChange({ ...config, body_fields: upd }) }} />
              {bf.value_mode === 'variable' && (
                <VariableDropdown value={bf.variable_id || ''} onChange={(v) => { const upd = [...bodyFields]; upd[idx] = { ...upd[idx], variable_id: v }; onChange({ ...config, body_fields: upd }) }} allTools={allTools} />
              )}
              {bf.value_mode === 'fixed' && (
                <input
                  value={bf.fixed_value || ''}
                  onChange={(e) => { const upd = [...bodyFields]; upd[idx] = { ...upd[idx], fixed_value: e.target.value }; onChange({ ...config, body_fields: upd }) }}
                  placeholder="ex: fr, premium, chatbot..."
                  className="text-[12px] px-2.5 py-1.5 rounded-lg"
                  style={{ background: 'var(--bg)', border: '1px solid var(--border-muted)', color: 'var(--text)', outline: 'none' }}
                />
              )}
              {bf.value_mode === 'llm' && (
                <input
                  value={bf.description || ''}
                  onChange={(e) => { const upd = [...bodyFields]; upd[idx] = { ...upd[idx], description: e.target.value }; onChange({ ...config, body_fields: upd }) }}
                  placeholder="Describe what the agent should provide (e.g. the date chosen by the customer)"
                  className="text-[12px] px-2.5 py-1.5 rounded-lg"
                  style={{ background: 'var(--bg)', border: '1px solid var(--border-muted)', color: 'var(--text)', outline: 'none' }}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Extraction Form ──

function ExtractionForm({ config, onChange }: { config: any; onChange: (c: any) => void }) {
  const fields: ExtractionField[] = config.fields || []

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-wider" style={{ color: 'var(--highlight)' }}>Fields to extract</span>
        <button onClick={() => onChange({ ...config, fields: [...fields, { name: '', type: 'text', description: '' }] })} className="text-[10px] font-medium px-2 py-0.5 rounded cursor-pointer" style={{ background: 'var(--bg-light)', border: '1px solid var(--border-muted)', color: 'var(--highlight)' }}>
          <FiPlus size={10} style={{ display: 'inline', verticalAlign: 'middle' }} /> Add
        </button>
      </div>
      {fields.map((f, idx) => (
        <div key={idx} className="rounded-lg p-3 flex flex-col gap-2" style={{ background: 'var(--bg-light)', border: '1px solid var(--border-muted)' }}>
          <div className="grid grid-cols-[1fr_auto_auto] gap-2 items-center">
            <input
              value={f.name}
              onChange={(e) => { const upd = [...fields]; upd[idx] = { ...upd[idx], name: e.target.value }; onChange({ ...config, fields: upd }) }}
              placeholder="Field name (e.g. customer_email)"
              className="text-[12px] font-mono px-2.5 py-1.5 rounded-lg"
              style={{ background: 'var(--bg)', border: '1px solid var(--border-muted)', color: 'var(--text)', outline: 'none' }}
            />
            <div className="w-28">
              <Dropdown
                options={extractionTypeOptions}
                value={f.type}
                onChange={(t) => { const upd = [...fields]; upd[idx] = { ...upd[idx], type: t }; onChange({ ...config, fields: upd }) }}
                size="sm"
              />
            </div>
            <button onClick={() => onChange({ ...config, fields: fields.filter((_, i) => i !== idx) })} className="w-6 h-6 rounded flex items-center justify-center cursor-pointer shrink-0" style={{ color: 'var(--highlight)' }} onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--danger)' }} onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--highlight)' }}>
              <FiTrash2 size={11} />
            </button>
          </div>
          <input
            value={f.description}
            onChange={(e) => { const upd = [...fields]; upd[idx] = { ...upd[idx], description: e.target.value }; onChange({ ...config, fields: upd }) }}
            placeholder="Hint for the agent (e.g. The customer's email address)"
            className="text-[12px] px-2.5 py-1.5 rounded-lg"
            style={{ background: 'var(--bg)', border: '1px solid var(--border-muted)', color: 'var(--text)', outline: 'none' }}
          />
          <span className="text-[10px]" style={{ color: 'var(--highlight)' }}>
            This name will be reusable in your other tools. Choose a simple, clear name.
          </span>
        </div>
      ))}
      {fields.length === 0 && (
        <p className="text-[12px] text-center py-4" style={{ color: 'var(--highlight)' }}>Add the information the agent should extract from the conversation.</p>
      )}
    </div>
  )
}

// ── Handoff Form ──

function HandoffForm({ config, onChange }: { config: any; onChange: (c: any) => void }) {
  const ctxOptions: string[] = config.context_options || ['none']
  const toggleCtx = (opt: string) => {
    if (opt === 'none') {
      onChange({ ...config, context_options: ['none'] })
      return
    }
    // Remove 'none', toggle the clicked option
    let next = ctxOptions.filter((o: string) => o !== 'none')
    if (next.includes(opt)) {
      next = next.filter((o: string) => o !== opt)
    } else {
      next = [...next, opt]
    }
    onChange({ ...config, context_options: next.length === 0 ? ['none'] : next })
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <span className="text-[11px] font-medium uppercase tracking-wider" style={{ color: 'var(--highlight)' }}>Transfer message <span style={{ fontWeight: 400, textTransform: 'none' }}>(optional)</span></span>
        <textarea
          value={config.transfer_message || ''}
          onChange={(e) => onChange({ ...config, transfer_message: e.target.value })}
          placeholder="What the agent tells the user just before transferring..."
          className="text-[13px] px-3 py-2.5 rounded-lg resize-none"
          style={{ background: 'var(--bg-light)', border: '1px solid var(--border-muted)', color: 'var(--text)', outline: 'none', minHeight: 60 }}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <span className="text-[11px] font-medium uppercase tracking-wider" style={{ color: 'var(--highlight)' }}>What to transmit?</span>
        {[
          { key: 'none', label: 'Nothing', desc: 'None' },
          { key: 'extracted', label: 'Extracted data', desc: 'All extracted variables' },
          { key: 'full', label: 'Full history', desc: 'The complete conversation word for word' },
        ].map(({ key, label, desc }) => {
          const active = ctxOptions.includes(key)
          return (
            <button
              key={key}
              onClick={() => toggleCtx(key)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-150 text-left"
              style={{
                background: active ? 'var(--primary-hover)' : 'var(--bg-light)',
                border: `1px solid ${active ? 'var(--primary)' : 'var(--border-muted)'}`,
              }}
            >
              <div
                className="w-4 h-4 rounded flex items-center justify-center shrink-0"
                style={{ background: active ? 'var(--primary)' : 'var(--bg)', border: `1px solid ${active ? 'var(--primary)' : 'var(--border)'}` }}
              >
                {active && <FiCheck size={10} style={{ color: 'var(--bg-dark)' }} />}
              </div>
              <div>
                <div className="text-[12px] font-medium" style={{ color: 'var(--text)' }}>{label}</div>
                <div className="text-[10px]" style={{ color: 'var(--highlight)' }}>{desc}</div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── Main ToolsTab ──

interface ToolsTabProps {
  tools: any[]
  allTools: any[]
  onUpdateTools: (tools: any[]) => void
}

export default function ToolsTab({ tools, allTools, onUpdateTools }: ToolsTabProps) {
  const [search, setSearch] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)

  // Create form
  const [formName, setFormName] = useState('')
  const [formDesc, setFormDesc] = useState('')
  const [formType, setFormType] = useState<ToolType>('http')
  const [formConfig, setFormConfig] = useState<any>(defaultConfigs.http)

  // Edit form
  const [editName, setEditName] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [editType, setEditType] = useState<ToolType>('http')
  const [editConfig, setEditConfig] = useState<any>({})

  const filtered = tools.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    (t.description || '').toLowerCase().includes(search.toLowerCase())
  )

  const resetForm = () => {
    setFormName(''); setFormDesc(''); setFormType('http'); setFormConfig(defaultConfigs.http)
  }

  const [formError, setFormError] = useState<string | null>(null)

  const handleCreate = () => {
    if (!formName.trim()) { setFormError('Please enter a tool name'); return }
    const duplicate = tools.find((t) => t.name === formName.trim())
    if (duplicate) { setFormError(`A tool "${formName.trim()}" already exists`); return }
    setFormError(null)
    const newTool = {
      id: crypto.randomUUID(),
      name: formName.trim(),
      description: formDesc.trim(),
      type: formType,
      config: formConfig,
    }
    onUpdateTools([...tools, newTool])
    resetForm()
    setFormOpen(false)
  }

  const handleEdit = (tool: any) => {
    setEditingId(tool.id)
    setEditName(tool.name)
    setEditDesc(tool.description || '')
    setEditType(tool.type || 'http')
    setEditConfig(tool.config || defaultConfigs[(tool.type || 'http') as ToolType])
    setFormOpen(false)
  }

  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null)
  const [editError, setEditError] = useState<string | null>(null)

  const handleSaveEdit = () => {
    if (!editName.trim() || !editingId) { setEditError('Please enter a tool name'); return }
    const duplicate = tools.find((t) => t.name === editName.trim() && t.id !== editingId)
    if (duplicate) { setEditError(`A tool "${editName.trim()}" already exists`); return }
    setEditError(null)
    onUpdateTools(tools.map((t) => t.id === editingId ? { ...t, name: editName.trim(), description: editDesc.trim(), type: editType, config: editConfig } : t))
    setEditingId(null)
  }

  const handleDelete = (id: string) => {
    onUpdateTools(tools.filter((t) => t.id !== id))
    if (editingId === id) setEditingId(null)
  }

  const handleTypeChange = (t: ToolType, isEdit: boolean) => {
    if (isEdit) { setEditType(t); setEditConfig(defaultConfigs[t]) }
    else { setFormType(t); setFormConfig(defaultConfigs[t]) }
  }

  // ── Render config form based on type ──
  const renderConfigForm = (type: ToolType, config: any, setConfig: (c: any) => void) => {
    switch (type) {
      case 'http': return <HttpForm config={config} onChange={setConfig} allTools={allTools} />
      case 'extraction': return <ExtractionForm config={config} onChange={setConfig} />
      case 'handoff': return <HandoffForm config={config} onChange={setConfig} />
    }
  }

  // ── Tool form (shared between create & edit) ──
  const renderToolForm = (isEdit: boolean) => {
    const name = isEdit ? editName : formName
    const setName = isEdit ? setEditName : setFormName
    const desc = isEdit ? editDesc : formDesc
    const setDesc = isEdit ? setEditDesc : setFormDesc
    const type = isEdit ? editType : formType
    const config = isEdit ? editConfig : formConfig
    const setConfig = isEdit ? setEditConfig : setFormConfig

    return (
      <div className="flex flex-col gap-4">
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nom du tool"
          className="text-[14px] font-semibold font-mono px-3.5 py-2.5 rounded-lg"
          style={{ background: 'var(--bg-light)', border: '1px solid var(--border-muted)', color: 'var(--text)', outline: 'none' }}
          onKeyDown={(e) => { if (e.key === 'Enter') isEdit ? handleSaveEdit() : handleCreate() }}
        />
        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-medium uppercase tracking-wider" style={{ color: 'var(--highlight)' }}>When to use?</span>
          <textarea
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="Explain to the agent when it should use this tool. The clearer, the better it will understand."
            className="text-[13px] px-3.5 py-2.5 rounded-lg resize-none"
            style={{ background: 'var(--bg-light)', border: '1px solid var(--border-muted)', color: 'var(--text)', outline: 'none', minHeight: 60 }}
          />
        </div>
        <ToolTypeSelector value={type} onChange={(t) => handleTypeChange(t, isEdit)} />
        <div className="rounded-lg p-4" style={{ background: 'var(--bg-light)', border: '1px solid var(--border-muted)' }}>
          {renderConfigForm(type, config, setConfig)}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header: search + add */}
      <div className="flex items-center gap-3">
        <div className="flex-1 flex items-center gap-2 px-3.5 py-2.5 rounded-xl" style={{ background: 'var(--bg)', border: '1px solid var(--border-muted)' }}>
          <FiSearch size={14} style={{ color: 'var(--highlight)', flexShrink: 0 }} />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search tools..." className="flex-1 text-[13px] font-medium" style={{ background: 'transparent', border: 'none', outline: 'none', color: 'var(--text)', padding: 0 }} />
        </div>
        <button
          onClick={() => { if (formOpen) { setFormOpen(false) } else { setFormOpen(true); setEditingId(null); resetForm() } }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-200 cursor-pointer shrink-0"
          style={{ background: 'var(--bg-light)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text)' }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)' }}
        >
          <FiPlus size={14} />
          Tool
        </button>
      </div>

      {/* Create form */}
      {formOpen && (
        <div className="rounded-xl p-5 flex flex-col gap-4" style={{ background: 'var(--bg)', border: '1px solid var(--text-muted)' }}>
          <div className="flex items-center gap-2 mb-1">
            <FiTool size={14} style={{ color: 'var(--text-muted)' }} />
            <span className="text-[13px] font-semibold" style={{ color: 'var(--text)' }}>New tool</span>
          </div>
          {renderToolForm(false)}
          {formError && <p className="text-[12px] font-medium px-1" style={{ color: 'var(--danger)' }}>{formError}</p>}
          <div className="flex items-center gap-2 justify-end">
            <button onClick={() => { setFormOpen(false); setFormError(null) }} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-medium cursor-pointer transition-colors duration-150" style={{ background: 'var(--bg-light)', border: '1px solid var(--border-muted)', color: 'var(--text-muted)' }} onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text)' }} onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)' }}>
              <FiX size={12} /> Cancel
            </button>
            <button onClick={handleCreate} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-semibold cursor-pointer transition-all duration-150" style={{ background: 'var(--text-muted)', color: 'var(--bg-dark)', border: 'none' }} onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.9' }} onMouseLeave={(e) => { e.currentTarget.style.opacity = '1' }}>
              <FiCheck size={12} /> Create
            </button>
          </div>
        </div>
      )}

      {/* Tool list */}
      <div className="flex flex-col gap-2">
        {filtered.map((tool) => (
          <div key={tool.id}>
            {editingId === tool.id ? (
              <div className="rounded-xl p-5 flex flex-col gap-4" style={{ background: 'var(--bg)', border: '1px solid var(--primary)' }}>
                {renderToolForm(true)}
                {editError && <p className="text-[12px] font-medium px-1" style={{ color: 'var(--danger)' }}>{editError}</p>}
                <div className="flex items-center gap-2 justify-between">
                  <button onClick={() => setDeleteTarget({ id: tool.id, name: tool.name })} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-medium cursor-pointer transition-colors duration-150" style={{ background: 'transparent', border: '1px solid var(--border-muted)', color: 'var(--danger)' }} onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--danger)' }} onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-muted)' }}>
                    <FiTrash2 size={12} /> Delete
                  </button>
                  <div className="flex items-center gap-2">
                    <button onClick={() => { setEditingId(null); setEditError(null) }} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-medium cursor-pointer transition-colors duration-150" style={{ background: 'var(--bg-light)', border: '1px solid var(--border-muted)', color: 'var(--text-muted)' }} onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text)' }} onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)' }}>
                      <FiX size={12} /> Cancel
                    </button>
                    <button onClick={handleSaveEdit} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-semibold cursor-pointer transition-all duration-150" style={{ background: 'var(--primary)', color: 'var(--bg-dark)', border: 'none' }} onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.9' }} onMouseLeave={(e) => { e.currentTarget.style.opacity = '1' }}>
                      <FiCheck size={12} /> Save
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div onClick={() => handleEdit(tool)} className="group rounded-xl p-4 transition-all duration-200 cursor-pointer" style={{ background: 'var(--bg)', border: '1px solid var(--border-muted)' }} onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--border)' }} onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-muted)' }}>
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5" style={{ background: 'var(--bg-light)', border: '1px solid var(--border-muted)' }}>
                    <FiTool size={14} style={{ color: typeColors[tool.type as ToolType] || 'var(--secondary)' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[14px] font-semibold font-mono" style={{ color: 'var(--text)' }}>{tool.name}</span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md uppercase" style={{ background: 'var(--bg-light)', color: typeColors[tool.type as ToolType] || 'var(--highlight)', border: '1px solid var(--border-muted)' }}>
                        {typeLabels[tool.type as ToolType] || tool.type}
                      </span>
                      {tool.type === 'http' && tool.config?.method && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md uppercase" style={{ background: 'var(--bg-light)', color: methodColors[tool.config.method] || 'var(--highlight)', border: '1px solid var(--border-muted)' }}>
                          {tool.config.method}
                        </span>
                      )}
                    </div>
                    {tool.type === 'http' && tool.config?.url && (
                      <p className="text-[12px] font-mono truncate mb-1" style={{ color: 'var(--highlight)', maxWidth: '100%' }} title={tool.config.url}>{tool.config.url}</p>
                    )}
                    {tool.type === 'extraction' && tool.config?.fields?.length > 0 && (
                      <p className="text-[12px] mb-1" style={{ color: 'var(--highlight)' }}>{tool.config.fields.map((f: any) => f.name).join(', ')}</p>
                    )}
                    {tool.description && (
                      <p className="text-[13px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>{tool.description}</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}

        {filtered.length === 0 && search && (
          <p className="text-[13px] text-center py-8" style={{ color: 'var(--highlight)' }}>No tools found for "{search}"</p>
        )}
      </div>

      {deleteTarget && (
        <DeleteModal
          title="Delete tool"
          name={deleteTarget.name}
          onConfirm={() => { handleDelete(deleteTarget.id); setDeleteTarget(null) }}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}
