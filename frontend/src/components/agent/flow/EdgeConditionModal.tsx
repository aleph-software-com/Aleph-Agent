import { useState } from 'react'
import { FiTrash2, FiX, FiCheck } from 'react-icons/fi'
import Dropdown from '../../ui/Dropdown'
import type { EdgeCondition } from './types'
import type { ToolVariable } from '../../../lib/variables'

const operators = [
  { value: '==', label: '==' },
  { value: '!=', label: '!=' },
  { value: '>', label: '>' },
  { value: '<', label: '<' },
  { value: '>=', label: '>=' },
  { value: '<=', label: '<=' },
  { value: 'contient', label: 'contient' },
]

interface EdgeConditionModalProps {
  initial: EdgeCondition | null
  variables: ToolVariable[]
  onSave: (data: EdgeCondition) => void
  onRemove: () => void
  onCancel: () => void
}

export default function EdgeConditionModal({ initial, variables, onSave, onRemove, onCancel }: EdgeConditionModalProps) {
  const [label, setLabel] = useState(initial?.label || '')
  const [variable, setVariable] = useState(initial?.variable || '')
  const [operator, setOperator] = useState(initial?.operator || operators[0].value)
  const [value, setValue] = useState(initial?.value || '')

  const variableOptions = variables.map((v) => ({ value: v.id, label: `${v.group} · ${v.label}` }))
  const hasVariables = variables.length > 0
  const canSave = label.trim() && (!hasVariables || variable)

  const handleSave = () => {
    if (canSave) onSave({ label: label.trim(), variable, operator, value })
  }

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div
        className="rounded-xl p-6 flex flex-col gap-5"
        style={{ background: 'var(--bg)', border: '1px solid var(--border-muted)', boxShadow: '0 8px 24px rgba(0,0,0,0.2)', minWidth: 380 }}
      >
        <span className="text-[14px] font-semibold" style={{ color: 'var(--text)' }}>Condition du lien</span>

        <div className="flex flex-col gap-3">
          {/* Label */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] font-medium uppercase tracking-wider" style={{ color: 'var(--highlight)' }}>Label</span>
            <input
              autoFocus
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Text displayed on the edge..."
              className="text-[13px] px-3 py-2.5 rounded-lg"
              style={{ background: 'var(--bg-light)', border: '1px solid var(--border-muted)', color: 'var(--text)', outline: 'none' }}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSave() }}
            />
          </div>

          {/* Variable */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] font-medium uppercase tracking-wider" style={{ color: 'var(--highlight)' }}>Variable</span>
            {hasVariables ? (
              <Dropdown options={variableOptions} value={variable} onChange={setVariable} size="sm" placeholder="Choose a variable..." />
            ) : (
              <div className="text-[13px] px-3 py-2 rounded-lg" style={{ background: 'var(--bg-light)', border: '1px solid var(--border-muted)', color: 'var(--highlight)', opacity: 0.6 }}>
                No upstream tools
              </div>
            )}
          </div>

          {/* Operator + Value */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] font-medium uppercase tracking-wider" style={{ color: 'var(--highlight)' }}>Operator</span>
              <Dropdown options={operators} value={operator} onChange={setOperator} size="sm" />
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] font-medium uppercase tracking-wider" style={{ color: 'var(--highlight)' }}>Value</span>
              <input
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="ex: achat, 500k..."
                className="text-[13px] px-3 py-2 rounded-lg"
                style={{ background: 'var(--bg-light)', border: '1px solid var(--border-muted)', color: 'var(--text)', outline: 'none' }}
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between">
          {initial ? (
            <button
              onClick={onRemove}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-medium cursor-pointer transition-colors duration-150"
              style={{ background: 'transparent', border: '1px solid var(--border-muted)', color: 'var(--danger)' }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--danger)' }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-muted)' }}
            >
              <FiTrash2 size={12} />
              Retirer
            </button>
          ) : <div />}
          <div className="flex items-center gap-2">
            <button
              onClick={onCancel}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[12px] font-medium cursor-pointer transition-colors duration-150"
              style={{ background: 'var(--bg-light)', border: '1px solid var(--border-muted)', color: 'var(--text-muted)' }}
              onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text)' }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)' }}
            >
              <FiX size={12} />
              Annuler
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[12px] font-semibold cursor-pointer transition-all duration-150"
              style={{ background: 'var(--primary)', color: 'var(--bg-dark)', border: 'none', opacity: canSave ? 1 : 0.5 }}
              onMouseEnter={(e) => { if (canSave) e.currentTarget.style.opacity = '0.9' }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = canSave ? '1' : '0.5' }}
            >
              <FiCheck size={12} />
              Sauvegarder
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
