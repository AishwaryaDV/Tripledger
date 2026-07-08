// src/components/shared/Calculator.tsx
import { useState, useRef } from 'react'
import { Calculator as CalcIcon } from 'lucide-react'

const BTN = 48  // button diameter px

const Calculator = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [display, setDisplay] = useState('0')
  const [operator, setOperator] = useState<string | null>(null)
  const [prevValue, setPrevValue] = useState<string | null>(null)
  const [waitingForOperand, setWaitingForOperand] = useState(false)

  // null = use default bottom-right position
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null)
  const dragRef = useRef<{
    startX: number; startY: number
    originX: number; originY: number
    moved: boolean
  } | null>(null)

  // ── Drag handlers ──────────────────────────────────────────────────────────

  const onPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    // Resolve current visual position from DOM so default bottom/right is respected
    const rect = e.currentTarget.getBoundingClientRect()
    dragRef.current = {
      startX: e.clientX, startY: e.clientY,
      originX: rect.left, originY: rect.top,
      moved: false,
    }
  }

  const onPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const d = dragRef.current
    if (!d) return
    const dx = e.clientX - d.startX
    const dy = e.clientY - d.startY
    if (!d.moved && Math.abs(dx) < 5 && Math.abs(dy) < 5) return
    d.moved = true
    setPos({
      x: Math.max(0, Math.min(window.innerWidth  - BTN, d.originX + dx)),
      y: Math.max(0, Math.min(window.innerHeight - BTN, d.originY + dy)),
    })
  }

  const onPointerUp = () => {
    if (dragRef.current && !dragRef.current.moved) setIsOpen(v => !v)
    dragRef.current = null
  }

  // ── Calc logic ─────────────────────────────────────────────────────────────

  const inputDigit = (digit: string) => {
    if (waitingForOperand) { setDisplay(digit); setWaitingForOperand(false) }
    else setDisplay(display === '0' ? digit : display + digit)
  }

  const inputDecimal = () => {
    if (waitingForOperand) { setDisplay('0.'); setWaitingForOperand(false); return }
    if (!display.includes('.')) setDisplay(display + '.')
  }

  const clear = () => { setDisplay('0'); setOperator(null); setPrevValue(null); setWaitingForOperand(false) }
  const toggleSign = () => setDisplay(String(parseFloat(display) * -1))
  const percentage = () => setDisplay(String(parseFloat(display) / 100))

  const calculate = (a: number, b: number, op: string): number => {
    switch (op) {
      case '+': return a + b
      case '−': return a - b
      case '×': return a * b
      case '÷': return b !== 0 ? a / b : 0
      default:  return b
    }
  }

  const handleOperator = (op: string) => {
    const current = parseFloat(display)
    if (prevValue !== null && operator && !waitingForOperand) {
      const result = calculate(parseFloat(prevValue), current, operator)
      setDisplay(String(result)); setPrevValue(String(result))
    } else {
      setPrevValue(display)
    }
    setOperator(op); setWaitingForOperand(true)
  }

  const equals = () => {
    if (!operator || prevValue === null) return
    const result = calculate(parseFloat(prevValue), parseFloat(display), operator)
    setDisplay(String(parseFloat(result.toFixed(10))))
    setOperator(null); setPrevValue(null); setWaitingForOperand(true)
  }

  type BtnDef = { label: string; action: () => void; wide?: boolean; variant: 'fn' | 'op' | 'num' }

  const rows: BtnDef[][] = [
    [
      { label: 'C',   action: clear,                     variant: 'fn' },
      { label: '+/−', action: toggleSign,                variant: 'fn' },
      { label: '%',   action: percentage,                variant: 'fn' },
      { label: '÷',   action: () => handleOperator('÷'), variant: 'op' },
    ],
    [
      { label: '7', action: () => inputDigit('7'),       variant: 'num' },
      { label: '8', action: () => inputDigit('8'),       variant: 'num' },
      { label: '9', action: () => inputDigit('9'),       variant: 'num' },
      { label: '×', action: () => handleOperator('×'),   variant: 'op' },
    ],
    [
      { label: '4', action: () => inputDigit('4'),       variant: 'num' },
      { label: '5', action: () => inputDigit('5'),       variant: 'num' },
      { label: '6', action: () => inputDigit('6'),       variant: 'num' },
      { label: '−', action: () => handleOperator('−'),   variant: 'op' },
    ],
    [
      { label: '1', action: () => inputDigit('1'),       variant: 'num' },
      { label: '2', action: () => inputDigit('2'),       variant: 'num' },
      { label: '3', action: () => inputDigit('3'),       variant: 'num' },
      { label: '+', action: () => handleOperator('+'),   variant: 'op' },
    ],
    [
      { label: '0', action: () => inputDigit('0'),       variant: 'num', wide: true },
      { label: '.', action: inputDecimal,                variant: 'num' },
      { label: '=', action: equals,                      variant: 'op' },
    ],
  ]

  const variantClass: Record<string, string> = {
    fn:  'text-black hover:opacity-80',
    op:  'text-white hover:opacity-80',
    num: 'text-white hover:opacity-80',
  }

  // ── Panel + button positioning ────────────────────────────────────────────

  const btnStyle: React.CSSProperties = pos
    ? { position: 'fixed', left: pos.x, top: pos.y, touchAction: 'none' }
    : { position: 'fixed', bottom: 20, right: 16, touchAction: 'none' }   // default: bottom-right corner

  const PANEL_W = 256
  const PANEL_H = 320
  const panelStyle: React.CSSProperties = pos
    ? {
        position: 'fixed',
        left: Math.max(8, Math.min(window.innerWidth - PANEL_W - 8, pos.x - PANEL_W / 2 + BTN / 2)),
        top: pos.y > PANEL_H + 16 ? pos.y - PANEL_H - 12 : pos.y + BTN + 12,
        background: '#1c1c1e',
      }
    : { position: 'fixed', bottom: 20 + BTN + 12, right: 16, background: '#1c1c1e' }  // default: above default button

  return (
    <>
      {/* Floating toggle / draggable button */}
      <button
        title="Calculator"
        aria-label="Toggle calculator"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        style={btnStyle}
        className="z-30 w-12 h-12 rounded-full bg-black text-white shadow-lg hover:bg-neutral-800 flex items-center justify-center cursor-grab active:cursor-grabbing select-none focus:outline-none"
      >
        <CalcIcon size={20} />
      </button>

      {/* Calculator panel */}
      {isOpen && (
        <div
          className="z-30 w-64 rounded-2xl overflow-hidden shadow-xl"
          style={panelStyle}
        >
          {/* Display */}
          <div className="px-4 pt-4 pb-3 text-right">
            <p className="text-xs h-4 mb-1 font-mono" style={{ color: '#636366' }}>
              {prevValue && operator ? `${prevValue} ${operator}` : '\u00A0'}
            </p>
            <p className="text-3xl font-light tracking-tight truncate font-mono text-white">{display}</p>
          </div>

          {/* Buttons */}
          <div className="p-2 space-y-1.5">
            {rows.map((row, ri) => (
              <div key={ri} className="grid grid-cols-4 gap-1.5">
                {row.map(btn => (
                  <button
                    key={btn.label}
                    onClick={btn.action}
                    className={`rounded-xl py-3 text-sm font-medium transition-opacity ${variantClass[btn.variant]} ${btn.wide ? 'col-span-2' : ''}`}
                    style={{
                      background: btn.variant === 'op' ? '#ff9f0a' : btn.variant === 'fn' ? '#a1a1a6' : '#3a3a3c',
                    }}
                  >
                    {btn.label}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  )
}

export default Calculator
