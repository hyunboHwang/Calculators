import { useMemo, useRef, useState } from 'react'
import { evaluate, formatResult, MathError } from '../lib/mathExpr'

const KEYS: { label: string; insert?: string; action?: 'clear' | 'back' | 'eval'; style?: string }[] = [
  { label: 'AC', action: 'clear', style: 'bg-tint text-accent hover:bg-rule/40' },
  { label: '⌫', action: 'back' },
  { label: '(', insert: '(' },
  { label: ')', insert: ')' },
  { label: '√', insert: '√(' },
  { label: '^', insert: '^' },
  { label: 'π', insert: 'π' },
  { label: 'e', insert: 'e' },
  { label: '7', insert: '7' },
  { label: '8', insert: '8' },
  { label: '9', insert: '9' },
  { label: '÷', insert: '÷', style: 'bg-tint text-accent hover:bg-rule/40' },
  { label: '4', insert: '4' },
  { label: '5', insert: '5' },
  { label: '6', insert: '6' },
  { label: '×', insert: '×', style: 'bg-tint text-accent hover:bg-rule/40' },
  { label: '1', insert: '1' },
  { label: '2', insert: '2' },
  { label: '3', insert: '3' },
  { label: '−', insert: '−', style: 'bg-tint text-accent hover:bg-rule/40' },
  { label: '0', insert: '0' },
  { label: '.', insert: '.' },
  { label: '%', insert: '%' },
  { label: '+', insert: '+', style: 'bg-tint text-accent hover:bg-rule/40' },
  { label: 'Ans', insert: 'Ans' },
  { label: 'abs', insert: 'abs(' },
  { label: '=', action: 'eval', style: 'col-span-2 bg-ink text-paper hover:bg-body' },
]

interface Entry {
  expr: string
  result: number
}

export default function GeneralCalculator() {
  const [expr, setExpr] = useState('')
  const [ans, setAns] = useState(0)
  const [history, setHistory] = useState<Entry[]>([])
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // 입력하는 동안 결과 미리보기 (식이 아직 완성되지 않았으면 표시하지 않음)
  const preview = useMemo(() => {
    if (expr.trim() === '') return null
    try {
      return evaluate(expr, ans)
    } catch {
      return null
    }
  }, [expr, ans])

  const run = () => {
    try {
      const result = evaluate(expr, ans)
      setAns(result)
      setHistory((h) => [{ expr, result }, ...h].slice(0, 10))
      setExpr(String(result))
      setError('')
    } catch (e) {
      setError(e instanceof MathError ? e.message : '계산할 수 없는 식입니다.')
    }
  }

  const insert = (text: string) => {
    const el = inputRef.current
    const start = el?.selectionStart ?? expr.length
    const end = el?.selectionEnd ?? expr.length
    setExpr(expr.slice(0, start) + text + expr.slice(end))
    setError('')
    requestAnimationFrame(() => {
      el?.focus()
      el?.setSelectionRange(start + text.length, start + text.length)
    })
  }

  const press = (k: (typeof KEYS)[number]) => {
    if (k.action === 'clear') {
      setExpr('')
      setError('')
    } else if (k.action === 'back') {
      const el = inputRef.current
      const s = el?.selectionStart ?? expr.length
      const e = el?.selectionEnd ?? expr.length
      const from = s === e ? Math.max(s - 1, 0) : s
      setExpr(expr.slice(0, from) + expr.slice(e))
      setError('')
      requestAnimationFrame(() => {
        el?.focus()
        el?.setSelectionRange(from, from)
      })
    } else if (k.action === 'eval') run()
    else if (k.insert) insert(k.insert)
  }

  const copy = async () => {
    const text = preview !== null ? String(preview) : String(ans)
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1200)
    } catch {
      // 클립보드 권한이 없으면 무시
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold">일반 계산기</h1>
      <p className="mt-1 mb-6 text-sm text-muted">
        괄호·거듭제곱·퍼센트·제곱근까지 한 줄 식으로 계산합니다. 키보드로 식을 입력하고 Enter를
        누르거나, 아래 버튼을 사용하세요.
      </p>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <section className="border border-rule bg-paper p-5">
          <input
            ref={inputRef}
            value={expr}
            onChange={(e) => {
              setExpr(e.target.value)
              setError('')
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                run()
              }
            }}
            inputMode="text"
            autoComplete="off"
            spellCheck={false}
            aria-label="계산식"
            placeholder="예: (3+4)*2^3/5"
            className="w-full border border-rule px-4 py-3 text-right text-xl tabular-nums focus:border-accent focus:ring-2 focus:ring-accent focus:outline-none"
          />
          <div className="mt-2 flex min-h-8 items-center justify-between gap-2">
            <p
              className={`min-h-6 text-right text-sm tabular-nums ${error ? 'text-accent' : 'text-muted'}`}
              aria-live="polite"
            >
              {error || (preview !== null ? `= ${formatResult(preview)}` : ' ')}
            </p>
            <button
              type="button"
              onClick={copy}
              className="shrink-0 border border-rule px-2.5 py-1 text-xs font-medium text-muted hover:bg-tint"
            >
              {copied ? '복사됨' : '결과 복사'}
            </button>
          </div>

          <div className="mt-3 grid grid-cols-4 gap-2">
            {KEYS.map((k) => (
              <button
                key={k.label}
                type="button"
                onClick={() => press(k)}
                className={`min-h-12 border border-rule text-lg font-medium transition-colors ${k.style ?? 'bg-tint text-ink hover:bg-rule/40'}`}
              >
                {k.label}
              </button>
            ))}
          </div>
        </section>

        <section className="h-fit border border-rule bg-paper p-5">
          <h2 className="mb-2 text-base font-semibold">최근 계산</h2>
          {history.length === 0 ? (
            <p className="text-sm text-muted">계산하면 여기에 기록됩니다.</p>
          ) : (
            <ul className="divide-y divide-rule">
              {history.map((h, i) => (
                <li key={i}>
                  <button
                    type="button"
                    onClick={() => {
                      setExpr(h.expr)
                      setError('')
                      inputRef.current?.focus()
                    }}
                    className="flex w-full items-baseline justify-between gap-3 py-2 text-left text-sm hover:bg-tint"
                  >
                    <span className="truncate text-muted">{h.expr}</span>
                    <span className="shrink-0 font-semibold tabular-nums text-ink">
                      = {formatResult(h.result)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-xs leading-relaxed text-muted">
            결과는 유효숫자 12자리로 정리해 표시합니다. 기록은 이 페이지를 닫으면 사라지며 어디에도
            저장되지 않습니다.
          </p>
        </section>
      </div>
    </div>
  )
}
