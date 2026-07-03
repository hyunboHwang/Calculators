/* 공용 입력/출력 컴포넌트 */

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
  return (
    <label className="block">
      <span className="mb-1 flex items-baseline justify-between text-sm font-medium text-slate-700">
        {label}
        {hint && <span className="text-xs font-normal text-slate-400">{hint}</span>}
      </span>
      <div className="relative">
        <input
          type="number"
          inputMode="decimal"
          min={0}
          step={step}
          value={Number.isNaN(value) ? '' : value}
          onChange={(e) => onChange(e.target.value === '' ? 0 : Number(e.target.value))}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 pr-10 text-right text-sm tabular-nums focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 focus:outline-none"
        />
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-slate-400">
          {suffix}
        </span>
      </div>
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
    <div className="flex items-center justify-between py-1.5">
      <span className={`text-sm ${strong ? 'font-semibold text-slate-800' : 'text-slate-500'}`}>
        {label}
        {sub && <span className="ml-1.5 text-xs text-slate-400">{sub}</span>}
      </span>
      <span
        className={`tabular-nums ${strong ? 'text-base font-bold' : 'text-sm font-medium'} ${
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
      <span className="mb-1 flex items-baseline justify-between text-sm font-medium text-slate-700">
        {label}
        {hint && <span className="text-xs font-normal text-slate-400">{hint}</span>}
      </span>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm tabular-nums focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 focus:outline-none"
      />
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
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      {title && <h2 className="mb-2 text-base font-semibold">{title}</h2>}
      {children}
    </div>
  )
}
