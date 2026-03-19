import { FiGitBranch } from 'react-icons/fi'
import type { ConditionEval } from '../types'

export default function ConditionBlock({ condition }: { condition: ConditionEval }) {
  const passed = condition.result
  const accentColor = 'var(--c-condition)'

  return (
    <div
      style={{ borderLeft: `2px solid ${accentColor}`, background: 'var(--bg)' }}
      className="rounded-r-md overflow-hidden"
    >
      <div className="flex items-center gap-2 px-3 py-2">
        <FiGitBranch size={14} style={{ color: accentColor, flexShrink: 0 }} />
        <span className="text-[13px] font-bold uppercase tracking-wider" style={{ color: accentColor, flexShrink: 0 }}>
          Condition
        </span>
        <span className="text-[12px] font-semibold ml-auto" style={{ color: accentColor }}>
          {passed ? 'VRAI' : 'FAUX'}
        </span>
      </div>
      <div className="px-4 pb-2.5 flex flex-col gap-1">
        <span className="text-[13px] font-medium" style={{ color: 'var(--text)' }}>{condition.label}</span>
        <span className="text-[12px] font-mono" style={{ color: 'var(--text-muted)' }}>
          {condition.variable} {condition.operator} "{condition.value}" (got: "{condition.actual}")
        </span>
      </div>
    </div>
  )
}
