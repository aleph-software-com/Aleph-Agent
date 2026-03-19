interface SectionProps {
  title: string
  action?: React.ReactNode
  children: React.ReactNode
}

export default function Section({ title, action, children }: SectionProps) {
  return (
    <div className="rounded-md overflow-hidden" style={{ background: 'var(--bg)', border: '1px solid var(--border-muted)' }}>
      <div
        className="w-full flex items-center justify-between px-5 py-2.5"
        style={{ background: 'var(--bg-light)' }}
      >
        <span className="text-[13px] font-semibold uppercase tracking-wider" style={{ color: 'var(--highlight)' }}>
          {title}
        </span>
        {action}
      </div>
      <div className="px-5 pb-5">
        <div className="pt-4 flex flex-col gap-5">{children}</div>
      </div>
    </div>
  )
}
