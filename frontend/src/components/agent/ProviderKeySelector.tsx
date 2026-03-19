import { useState, useEffect, useRef } from 'react'
import { FiTrash2 } from 'react-icons/fi'
import { MdKey } from 'react-icons/md'
import { crypto } from '../../lib/api'

interface Props {
  hint: string | null
  onSave: (encrypted: string, hint: string) => void
  onRemove: () => void
}

export default function ProviderKeySelector({ hint, onSave, onRemove }: Props) {
  const [open, setOpen] = useState(false)
  const [newKey, setNewKey] = useState('')
  const [loading, setLoading] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const hasKey = !!hint

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        setNewKey('')
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  useEffect(() => {
    if (open && !hasKey && inputRef.current) inputRef.current.focus()
  }, [open, hasKey])

  const handleAdd = async () => {
    if (!newKey.trim()) return
    setLoading(true)
    try {
      const { encrypted, hint: h } = await crypto.encryptKey(newKey.trim())
      onSave(encrypted, h)
      setNewKey('')
      setOpen(false)
    } finally { setLoading(false) }
  }

  const handleDelete = () => {
    onRemove()
    setOpen(false)
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium cursor-pointer transition-all duration-200"
        style={{
          background: hasKey ? 'rgba(52,211,153,0.1)' : 'transparent',
          border: `1px solid ${hasKey ? 'rgba(52,211,153,0.3)' : 'var(--border-muted)'}`,
          color: hasKey ? 'rgb(52,211,153)' : 'var(--highlight)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = hasKey ? 'rgba(52,211,153,0.5)' : 'var(--border)'
          e.currentTarget.style.color = hasKey ? 'rgb(52,211,153)' : 'var(--text-muted)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = hasKey ? 'rgba(52,211,153,0.3)' : 'var(--border-muted)'
          e.currentTarget.style.color = hasKey ? 'rgb(52,211,153)' : 'var(--highlight)'
        }}
      >
        <MdKey size={13} />
        {hasKey ? `····${hint}` : 'API Key'}
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-1 z-50 rounded-lg overflow-hidden"
          style={{
            width: 240,
            background: 'var(--bg)',
            border: '1px solid var(--border-muted)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
          }}
        >
          {hasKey ? (
            <div className="flex items-center gap-2.5 px-3 py-2.5">
              <MdKey size={14} style={{ color: 'rgb(52,211,153)' }} />
              <span className="flex-1 text-[12px] font-mono" style={{ color: 'var(--text)' }}>
                ····{hint}
              </span>
              <button
                onClick={handleDelete}
                className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium cursor-pointer transition-colors duration-150"
                style={{ color: 'var(--danger)', background: 'transparent', border: 'none' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
              >
                <FiTrash2 size={11} />
                Retirer
              </button>
            </div>
          ) : (
            <div className="flex gap-1.5 p-2.5">
              <input
                ref={inputRef}
                type="password"
                placeholder="sk-..."
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') { setOpen(false); setNewKey('') } }}
                className="flex-1 min-w-0 px-2.5 py-1.5 rounded-md text-[12px] font-mono outline-none"
                style={{ background: 'var(--bg-light)', border: '1px solid var(--border-muted)', color: 'var(--text)' }}
              />
              <button
                onClick={handleAdd}
                disabled={!newKey.trim() || loading}
                className="px-3 py-1.5 rounded-md text-[11px] font-semibold cursor-pointer"
                style={{
                  background: newKey.trim() ? 'var(--primary)' : 'var(--bg-light)',
                  color: newKey.trim() ? 'var(--bg-dark)' : 'var(--highlight)',
                  border: 'none',
                  opacity: loading ? 0.6 : 1,
                }}
              >
                {loading ? '...' : 'OK'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
