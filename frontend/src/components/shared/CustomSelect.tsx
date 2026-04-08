// src/components/shared/CustomSelect.tsx
import { useState, useEffect, useRef } from 'react'
import { ChevronDown, Check } from 'lucide-react'

export interface SelectOption {
  value: string
  label: string
}

interface CustomSelectProps {
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  className?: string
  buttonClassName?: string
}

const CustomSelect = ({ value, onChange, options, className = '', buttonClassName = '' }: CustomSelectProps) => {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  const selected = options.find(o => o.value === value)

  return (
    <div ref={ref} className={`relative inline-block ${className}`}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className={`w-full flex items-center gap-2 border rounded-lg pl-3 pr-2.5 py-1.5 text-xs bg-background transition-colors focus:outline-none focus:ring-2 focus:ring-primary ${
          open ? 'border-primary ring-2 ring-primary' : 'hover:border-primary/50'
        } ${buttonClassName}`}
      >
        <span className="text-foreground">{selected?.label}</span>
        <ChevronDown
          size={12}
          className={`text-muted-foreground transition-transform shrink-0 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 z-30 bg-card border rounded-lg shadow-lg py-1 min-w-full">
          {options.map(opt => {
            const isSelected = opt.value === value
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => { onChange(opt.value); setOpen(false) }}
                className={`w-full flex items-center justify-between gap-3 text-left px-3 py-1.5 text-xs transition-colors hover:bg-muted ${
                  isSelected ? 'text-primary font-medium' : 'text-foreground'
                }`}
              >
                {opt.label}
                {isSelected && <Check size={11} className="text-primary shrink-0" />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default CustomSelect
