import { useRef, useEffect } from 'react'
import { FiTrash2 } from 'react-icons/fi'

interface MoreMenuProps {
  onDelete: () => void
  onClose: () => void
}

export default function MoreMenu({ onDelete, onClose }: MoreMenuProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [onClose])

  return (
    <div
      ref={ref}
      className="absolute right-0 top-full mt-1 z-50 rounded-lg py-1 overflow-hidden"
      style={{
        background: 'var(--bg)',
        border: '1px solid var(--border-muted)',
        boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
        minWidth: 160,
      }}
    >
      <button
        onClick={(e) => { e.stopPropagation(); onDelete() }}
        className="w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors duration-100 cursor-pointer"
        style={{ background: 'transparent', border: 'none', color: 'var(--danger)' }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-light)' }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
      >
        <FiTrash2 size={13} />
        <span className="text-[12px] font-medium">Delete</span>
      </button>
    </div>
  )
}
