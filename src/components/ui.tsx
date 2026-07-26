/* 공용 입력/출력 컴포넌트 */

import { useEffect, useState } from 'react'

export const fmt = (n: number) =>
  Number.isFinite(n) ? Math.round(n).toLocaleString('ko-KR') : '-'

export const fmtPct = (n: number) => (Number.isFinite(n) ? `${n.toFixed(1)}%` : '-')

export function Field({
  label,
  value,
  onChange,
  suffix = '원',
  step = 100,
  hint,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  suffix?: string
  step?: number
  hint?: string
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
      <span className="mb-1.5 block text-sm font-medium text-slate-700">{label}</span>
      <div className="relative">
        <input
          type="number"
          inputMode="decimal"
          min={0}
          step={step}
          value={text}
          onChange={(e) => {
            const raw = e.target.value
            setText(raw)
            const n = raw === '' ? 0 : Number(raw)
            if (Number.isFinite(n)) onChange(n)
          }}
          onBlur={() => setText(Number.isFinite(value) ? String(value) : '')}
          className="w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2.5 pr-11 text-right text-sm tabular-nums transition-colors hover:border-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 focus:outline-none"
        />
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-slate-400">
          {suffix}
        </span>
      </div>
      {hint && <span className="mt-1.5 block text-xs leading-relaxed text-slate-400">{hint}</span>}
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
    <div className="flex flex-wrap items-baseline justify-between gap-x-3 py-2">
      <span
        className={`min-w-0 text-sm ${strong ? 'font-semibold text-slate-800' : 'text-slate-500'}`}
      >
        {label}
        {sub && <span className="ml-1.5 text-xs text-slate-400">{sub}</span>}
      </span>
      <span
        className={`ml-auto text-right tabular-nums ${strong ? 'text-base font-bold' : 'text-sm font-medium'} ${
          negative ? 'text-red-600' : 'text-slate-800'
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
      <span className="mb-1.5 block text-sm font-medium text-slate-700">{label}</span>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm tabular-nums transition-colors hover:border-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 focus:outline-none"
      />
      {hint && <span className="mt-1.5 block text-xs leading-relaxed text-slate-400">{hint}</span>}
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
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      {title && (
        <h2 className="mb-3 flex items-center gap-2 text-base font-semibold">
          <span className="h-4 w-1 rounded-full bg-emerald-500" aria-hidden="true" />
          {title}
        </h2>
      )}
      {children}
    </div>
  )
}
