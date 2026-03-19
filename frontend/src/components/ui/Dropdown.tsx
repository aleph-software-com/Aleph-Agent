import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { FiChevronDown, FiCheck } from 'react-icons/fi'

export interface DropdownOption {
  value: string
  label: string
  description?: string
  icon?: React.ReactNode
}

interface DropdownProps {
  options: DropdownOption[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  size?: 'sm' | 'md'
}

function getPortalRoot() {
  return document.getElementById('portal-root') || document.body
}

export default function Dropdown({
  options,
  value,
  onChange,
  placeholder = 'Select...',
  className = '',
  size = 'md',
}: DropdownProps) {
  const [open, setOpen] = useState(false)
  const [menuPos, setMenuPos] = useState<{ top: number; left: number; width: number }>({ top: 0, left: 0, width: 0 })
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const selected = options.find((o) => o.value === value)

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    setMenuPos({ top: rect.bottom + 6, left: rect.left, width: rect.width })
  }, [])

  useEffect(() => {
    if (!open) return
    updatePosition()
    function handleClick(e: MouseEvent) {
      if (
        triggerRef.current?.contains(e.target as Node) ||
        menuRef.current?.contains(e.target as Node)
      ) return
      setOpen(false)
    }
    function handleScroll() { updatePosition() }
    document.addEventListener('mousedown', handleClick)
    window.addEventListener('scroll', handleScroll, true)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      window.removeEventListener('scroll', handleScroll, true)
    }
  }, [open, updatePosition])

  const py = size === 'sm' ? 'py-1.5' : 'py-2.5'
  const textSize = size === 'sm' ? 'text-[12px]' : 'text-[13px]'

  return (
    <div className={`relative ${className}`}>
      {/* Trigger */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(!open)}
        className={`w-full flex items-center justify-between gap-2 px-3.5 ${py} rounded-lg ${textSize} font-medium transition-all duration-200 cursor-pointer`}
        style={{
          background: 'var(--bg-light)',
          border: open ? '1px solid var(--primary)' : '1px solid var(--border-muted)',
          color: selected ? 'var(--text)' : 'var(--highlight)',
        }}
      >
        <div className="flex items-center gap-2 min-w-0">
          {selected?.icon}
          <span className="truncate">{selected?.label || placeholder}</span>
        </div>
        <FiChevronDown
          size={14}
          className="shrink-0 transition-transform duration-200"
          style={{
            color: 'var(--highlight)',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        />
      </button>

      {/* Menu — portaled to #portal-root (outside body overflow:hidden) */}
      {open && createPortal(
        <div
          ref={menuRef}
          className="rounded-xl py-1"
          style={{
            position: 'fixed',
            top: menuPos.top,
            left: menuPos.left,
            width: menuPos.width,
            zIndex: 99999,
            pointerEvents: 'auto',
            background: 'var(--bg)',
            border: '1px solid var(--border-muted)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
            maxHeight: 260,
            overflowY: 'auto',
          }}
        >
          {options.map((option) => {
            const isActive = option.value === value
            return (
              <button
                key={option.value}
                onClick={() => {
                  onChange(option.value)
                  setOpen(false)
                }}
                className={`w-full flex items-center gap-3 px-3.5 ${py} text-left transition-colors duration-100 cursor-pointer`}
                style={{
                  background: isActive ? 'var(--primary-hover)' : 'transparent',
                  border: 'none',
                  color: isActive ? 'var(--text)' : 'var(--text-muted)',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'var(--bg-light)'
                    e.currentTarget.style.color = 'var(--text)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'transparent'
                    e.currentTarget.style.color = 'var(--text-muted)'
                  }
                }}
              >
                {option.icon && (
                  <div className="shrink-0">{option.icon}</div>
                )}
                <div className="flex-1 min-w-0">
                  <div className={`${textSize} font-medium truncate`}>{option.label}</div>
                  {option.description && (
                    <div className="text-[11px] truncate" style={{ color: 'var(--highlight)' }}>
                      {option.description}
                    </div>
                  )}
                </div>
                {isActive && (
                  <FiCheck size={14} className="shrink-0" style={{ color: 'var(--primary)' }} />
                )}
              </button>
            )
          })}
          {options.length === 0 && (
            <div className="px-3.5 py-3 text-[12px] text-center" style={{ color: 'var(--highlight)' }}>
              No options
            </div>
          )}
        </div>,
        getPortalRoot(),
      )}
    </div>
  )
}
