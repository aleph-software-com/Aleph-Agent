import { useState } from 'react'
import { FiPlus, FiSearch, FiTrash2, FiX, FiCheck } from 'react-icons/fi'
import { LuListChecks } from 'react-icons/lu'
import Dropdown from '../ui/Dropdown'
import DeleteModal from '../ui/DeleteModal'

interface TaskTabProps {
  tasks: any[]
  allTools: any[]
  onUpdateTasks: (tasks: any[]) => void
}

export default function TaskTab({ tasks, allTools, onUpdateTasks }: TaskTabProps) {
  const [search, setSearch] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null)

  // Create form state
  const [formName, setFormName] = useState('')
  const [formDesc, setFormDesc] = useState('')
  const [formPrompt, setFormPrompt] = useState('')
  const [formExitCondition, setFormExitCondition] = useState('')

  // Edit form state
  const [editName, setEditName] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [editPrompt, setEditPrompt] = useState('')
  const [editExitCondition, setEditExitCondition] = useState('')

  const filtered = tasks.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    (t.description || '').toLowerCase().includes(search.toLowerCase())
  )

  const resetCreateForm = () => {
    setFormName('')
    setFormDesc('')
    setFormPrompt('')
    setFormExitCondition('')
  }

  const handleCreate = () => {
    if (!formName.trim()) return
    const newTask = {
      id: crypto.randomUUID(),
      name: formName.trim(),
      description: formDesc.trim(),
      prompt: formPrompt.trim(),
      exit_condition: formExitCondition.trim(),
    }
    onUpdateTasks([...tasks, newTask])
    resetCreateForm()
    setFormOpen(false)
  }

  const handleEdit = (task: any) => {
    setEditingId(task.id)
    setEditName(task.name)
    setEditDesc(task.description || '')
    setEditPrompt(task.prompt || '')
    setEditExitCondition(task.exit_condition || '')
    setFormOpen(false)
  }

  const handleSaveEdit = () => {
    if (!editName.trim() || !editingId) return
    const updated = tasks.map((t) =>
      t.id === editingId
        ? { ...t, name: editName.trim(), description: editDesc.trim(), prompt: editPrompt.trim(), exit_condition: editExitCondition.trim() }
        : t
    )
    onUpdateTasks(updated)
    setEditingId(null)
  }

  const handleDelete = (id: string) => {
    onUpdateTasks(tasks.filter((t) => t.id !== id))
    if (editingId === id) setEditingId(null)
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header: search + add */}
      <div className="flex items-center gap-3">
        <div
          className="flex-1 flex items-center gap-2 px-3.5 py-2.5 rounded-xl"
          style={{ background: 'var(--bg)', border: '1px solid var(--border-muted)' }}
        >
          <FiSearch size={14} style={{ color: 'var(--highlight)', flexShrink: 0 }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tasks..."
            className="flex-1 text-[13px] font-medium"
            style={{ background: 'transparent', border: 'none', outline: 'none', color: 'var(--text)', padding: 0 }}
          />
        </div>
        <button
          onClick={() => { if (formOpen) { setFormOpen(false) } else { setFormOpen(true); setEditingId(null); resetCreateForm() } }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-200 cursor-pointer shrink-0"
          style={{ background: 'var(--bg-light)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text)' }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)' }}
        >
          <FiPlus size={14} />
          Task
        </button>
      </div>

      {/* Create form */}
      {formOpen && (
        <div
          className="rounded-xl p-5 flex flex-col gap-4"
          style={{ background: 'var(--bg)', border: '1px solid var(--text-muted)' }}
        >
          <div className="flex items-center gap-2 mb-1">
            <LuListChecks size={14} style={{ color: 'var(--text-muted)' }} />
            <span className="text-[13px] font-semibold" style={{ color: 'var(--text)' }}>New task</span>
          </div>
          <input
            autoFocus
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            placeholder="Task name"
            className="text-[14px] font-semibold px-3.5 py-2.5 rounded-lg"
            style={{ background: 'var(--bg-light)', border: '1px solid var(--border-muted)', color: 'var(--text)', outline: 'none' }}
            onKeyDown={(e) => { if (e.key === 'Enter') handleCreate() }}
          />
          <textarea
            value={formDesc}
            onChange={(e) => setFormDesc(e.target.value)}
            placeholder="Description (optional)"
            className="text-[13px] px-3.5 py-2.5 rounded-lg resize-none"
            style={{ background: 'var(--bg-light)', border: '1px solid var(--border-muted)', color: 'var(--text)', outline: 'none', minHeight: 60 }}
          />
          <textarea
            value={formPrompt}
            onChange={(e) => setFormPrompt(e.target.value)}
            placeholder="Task instructions... These instructions are stacked on top of the agent's prompt."
            className="text-[13px] px-3.5 py-2.5 rounded-lg resize-none"
            style={{
              background: 'var(--bg-light)',
              border: '1px solid var(--border-muted)',
              color: 'var(--text)',
              outline: 'none',
              minHeight: 120,
              fontFamily: 'monospace',
            }}
          />
          <div>
            <div className="text-[12px] font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>
              Completed when this tool succeeds
            </div>
            <Dropdown
              options={[
                { value: '', label: 'None (no condition)' },
                ...allTools.map((t: any) => ({ value: t.name, label: t.name, description: t.type })),
              ]}
              value={formExitCondition}
              onChange={setFormExitCondition}
              placeholder="Choose a tool..."
            />
          </div>
          <div className="flex items-center gap-2 justify-end">
            <button
              onClick={() => setFormOpen(false)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-medium cursor-pointer transition-colors duration-150"
              style={{ background: 'var(--bg-light)', border: '1px solid var(--border-muted)', color: 'var(--text-muted)' }}
              onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text)' }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)' }}
            >
              <FiX size={12} />
              Cancel
            </button>
            <button
              onClick={handleCreate}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-semibold cursor-pointer transition-all duration-150"
              style={{ background: 'var(--text-muted)', color: 'var(--bg-dark)', border: 'none' }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.9' }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = '1' }}
            >
              <FiCheck size={12} />
              Create
            </button>
          </div>
        </div>
      )}

      {/* Task list */}
      <div className="flex flex-col gap-2">
        {filtered.map((task) => (
          <div key={task.id}>
            {editingId === task.id ? (
              /* Edit mode */
              <div
                className="rounded-xl p-5 flex flex-col gap-3"
                style={{ background: 'var(--bg)', border: '1px solid var(--primary)' }}
              >
                <input
                  autoFocus
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="text-[14px] font-semibold px-3.5 py-2.5 rounded-lg"
                  style={{ background: 'var(--bg-light)', border: '1px solid var(--border-muted)', color: 'var(--text)', outline: 'none' }}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSaveEdit() }}
                />
                <textarea
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  placeholder="Description (optional)"
                  className="text-[13px] px-3.5 py-2.5 rounded-lg resize-none"
                  style={{ background: 'var(--bg-light)', border: '1px solid var(--border-muted)', color: 'var(--text)', outline: 'none', minHeight: 60 }}
                />
                <textarea
                  value={editPrompt}
                  onChange={(e) => setEditPrompt(e.target.value)}
                  placeholder="Task instructions... These instructions are stacked on top of the agent's prompt."
                  className="text-[13px] px-3.5 py-2.5 rounded-lg resize-none"
                  style={{
                    background: 'var(--bg-light)',
                    border: '1px solid var(--border-muted)',
                    color: 'var(--text)',
                    outline: 'none',
                    minHeight: 120,
                    fontFamily: 'monospace',
                  }}
                />
                <div>
                  <div className="text-[12px] font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>
                    Completed when this tool succeeds
                  </div>
                  <Dropdown
                    options={[
                      { value: '', label: 'None (no condition)' },
                      ...allTools.map((t: any) => ({ value: t.name, label: t.name, description: t.type })),
                    ]}
                    value={editExitCondition}
                    onChange={setEditExitCondition}
                    placeholder="Choose a tool..."
                  />
                </div>

                <div className="flex items-center gap-2 justify-between">
                  <button
                    onClick={() => setDeleteTarget({ id: task.id, name: task.name })}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-medium cursor-pointer transition-colors duration-150"
                    style={{ background: 'transparent', border: '1px solid var(--border-muted)', color: 'var(--danger)' }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--danger)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-muted)' }}
                  >
                    <FiTrash2 size={12} />
                    Delete
                  </button>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setEditingId(null)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-medium cursor-pointer transition-colors duration-150"
                      style={{ background: 'var(--bg-light)', border: '1px solid var(--border-muted)', color: 'var(--text-muted)' }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text)' }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)' }}
                    >
                      <FiX size={12} />
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveEdit}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-semibold cursor-pointer transition-all duration-150"
                      style={{ background: 'var(--primary)', color: 'var(--bg-dark)', border: 'none' }}
                      onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.9' }}
                      onMouseLeave={(e) => { e.currentTarget.style.opacity = '1' }}
                    >
                      <FiCheck size={12} />
                      Save
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* View mode */
              <div
                onClick={() => handleEdit(task)}
                className="group rounded-xl p-4 transition-all duration-200 cursor-pointer"
                style={{ background: 'var(--bg)', border: '1px solid var(--border-muted)' }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--border)' }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-muted)' }}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                    style={{ background: 'var(--bg-light)', border: '1px solid var(--border-muted)' }}
                  >
                    <LuListChecks size={14} style={{ color: 'var(--danger)' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[14px] font-semibold" style={{ color: 'var(--text)' }}>{task.name}</span>
                    </div>
                    {task.description && (
                      <p className="text-[13px] leading-relaxed mt-1" style={{ color: 'var(--text-muted)' }}>{task.description}</p>
                    )}
                    {task.prompt && (
                      <p
                        className="text-[12px] leading-relaxed mt-1.5 truncate"
                        style={{ color: 'var(--highlight)', fontFamily: 'monospace' }}
                      >
                        {task.prompt.length > 80 ? task.prompt.slice(0, 80) + '...' : task.prompt}
                      </p>
                    )}
                    {task.exit_condition && (
                      <span
                        className="inline-flex items-center gap-1 text-[11px] font-medium mt-2 px-2 py-0.5 rounded"
                        style={{ background: 'var(--bg-light)', border: '1px solid var(--border-muted)', color: 'var(--highlight)' }}
                      >
                        <FiCheck size={10} />
                        End: {task.exit_condition}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}

        {filtered.length === 0 && search && (
          <p className="text-[13px] text-center py-8" style={{ color: 'var(--highlight)' }}>
            No tasks found for "{search}"
          </p>
        )}
      </div>

      {deleteTarget && (
        <DeleteModal
          title="Delete task"
          name={deleteTarget.name}
          onConfirm={() => { handleDelete(deleteTarget.id); setDeleteTarget(null) }}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}
