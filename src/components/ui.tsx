/* 공용 입력/출력 컴포넌트 */

import { useEffect, useState } from 'react'

export const fmt = (n: number) =>
  Number.isFinite(n) ? (Math.round(n) + 0).toLocaleString('ko-KR') : '-'

export const fmtPct = (n: number) => (Number.isFinite(n) ? `${n.toFixed(1)}%` : '-')

export function Field({
  label,
  value,
  onChange,
  suffix = '원',
  step = 100,
  hint,
  allowNegative = false,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  suffix?: string
  step?: number
  hint?: string
  /** 음수가 정당한 필드(예: 수익률)만 true. 기본은 음수를 0으로 처리 */
  allowNegative?: boolean
}) {
  // 입력 중에는 문자열로 관리 → 0을 지우고 빈칸 상태로 타이핑 가능
  const [text, setText] = useState(() => (Number.isFinite(value) ? String(value) : ''))

  // 프리셋 버튼 등 외부에서 값이 바뀌면 표시 문자열 동기화
  useEffect(() => {
    const parsed = text === '' ? 0 : Number(text)
    if (parsed !== value) setText(Number.isFinite(value) ? String(value) : '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  return (
    <label className="block">
      <span className="block text-xs font-medium text-muted">{label}</span>
      <div className="relative">
        <input
          type="number"
          inputMode="decimal"
          min={0}
          step={step}
          value={text}
          onChange={(e) => {
            let raw = e.target.value
            let n = raw === '' ? 0 : Number(raw)
            if (!allowNegative && n < 0) {
              raw = '0'
              n = 0
            }
            setText(raw)
            if (Number.isFinite(n)) onChange(n + 0)
          }}
          onBlur={() => setText(Number.isFinite(value) ? String(value) : '')}
          className="w-full min-w-0 border-0 border-b-2 border-ink bg-transparent px-0 py-2 pr-9 text-right font-mono text-xl text-ink tabular-nums focus:border-accent focus:outline-none"
        />
        <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center text-xs text-muted">
          {suffix}
        </span>
      </div>
      {hint && <span className="mt-1.5 block text-xs leading-relaxed text-muted">{hint}</span>}
    </label>
  )
}

export function Row({
  label,
  value,
  sub,
  strong,
  negative,
}: {
  label: string
  value: string
  sub?: string
  strong?: boolean
  negative?: boolean
}) {
  return (
    <div
      className={`flex flex-wrap items-baseline justify-between gap-x-3 border-b py-2 ${
        strong ? 'border-t border-t-ink border-b-rule' : 'border-rule'
      }`}
    >
      <span
        className={`min-w-0 text-sm ${strong ? 'font-semibold text-ink' : 'text-muted'}`}
      >
        {label}
        {sub && <span className="ml-1.5 text-xs text-muted">{sub}</span>}
      </span>
      <span
        className={`ml-auto text-right font-mono tabular-nums ${strong ? 'text-base font-bold' : 'text-sm font-medium'} ${
          negative ? 'text-accent' : 'text-ink'
        }`}
      >
        {value}
      </span>
    </div>
  )
}

export function DateField({
  label,
  value,
  onChange,
  hint,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  hint?: string
}) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-muted">{label}</span>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border-0 border-b-2 border-ink bg-transparent px-0 py-2 font-mono text-base text-ink tabular-nums focus:border-accent focus:outline-none"
      />
      {hint && <span className="mt-1.5 block text-xs leading-relaxed text-muted">{hint}</span>}
    </label>
  )
}

export function Card({
  title,
  children,
}: {
  title?: string
  children: React.ReactNode
}) {
  return (
    <div className="border-t border-ink pt-4">
      {title && <h2 className="mb-3 font-serif text-base font-semibold text-ink">{title}</h2>}
      {children}
    </div>
  )
}

export function Result({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="border-t-4 border-double border-ink pt-3">
      <div className="text-xs font-medium text-muted">{label}</div>
      <div className="mt-1 font-serif text-3xl font-bold text-ink tabular-nums">
        {value}
        {unit && <span className="ml-1 text-base font-semibold">{unit}</span>}
      </div>
    </div>
  )
}
