export type VerdictTone = 'good' | 'neutral' | 'warn'

export interface Verdict {
  tone: VerdictTone
  badgeLabel: string
  headline: string
  headlineUnit?: string
  description: string
}

const TONE_STYLE: Record<VerdictTone, { box: string; badge: string }> = {
  good: { box: 'border-ink bg-tint', badge: 'bg-ink' },
  neutral: { box: 'border-rule bg-tint', badge: 'bg-muted' },
  warn: { box: 'border-accent bg-tint', badge: 'bg-accent' },
}

export default function VerdictBanner({ verdict }: { verdict: Verdict }) {
  const style = TONE_STYLE[verdict.tone]
  return (
    <div className={`border-y p-5 ${style.box}`}>
      <div className="flex flex-wrap items-center gap-3">
        <span
          className={`shrink-0 px-3 py-1 text-sm font-bold whitespace-nowrap text-white ${style.badge}`}
        >
          {verdict.badgeLabel}
        </span>
        <span className="font-serif text-2xl font-bold tabular-nums">{verdict.headline}</span>
        {verdict.headlineUnit && (
          <span className="text-sm text-muted">{verdict.headlineUnit}</span>
        )}
      </div>
      <p className="mt-3 text-sm leading-relaxed text-body">{verdict.description}</p>
    </div>
  )
}
