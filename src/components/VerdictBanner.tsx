export type VerdictTone = 'good' | 'neutral' | 'warn'

export interface Verdict {
  tone: VerdictTone
  badgeLabel: string
  headline: string
  headlineUnit?: string
  description: string
}

const TONE_STYLE: Record<VerdictTone, { box: string; badge: string }> = {
  good: { box: 'border-emerald-200 bg-emerald-50', badge: 'bg-emerald-600' },
  neutral: { box: 'border-slate-200 bg-slate-50', badge: 'bg-slate-600' },
  warn: { box: 'border-amber-200 bg-amber-50', badge: 'bg-amber-500' },
}

export default function VerdictBanner({ verdict }: { verdict: Verdict }) {
  const style = TONE_STYLE[verdict.tone]
  return (
    <div className={`rounded-2xl border p-5 ${style.box}`}>
      <div className="flex flex-wrap items-center gap-3">
        <span
          className={`shrink-0 rounded-full px-3 py-1 text-sm font-bold whitespace-nowrap text-white ${style.badge}`}
        >
          {verdict.badgeLabel}
        </span>
        <span className="text-2xl font-extrabold tabular-nums">{verdict.headline}</span>
        {verdict.headlineUnit && (
          <span className="text-sm text-slate-500">{verdict.headlineUnit}</span>
        )}
      </div>
      <p className="mt-3 text-sm leading-relaxed text-slate-600">{verdict.description}</p>
    </div>
  )
}
