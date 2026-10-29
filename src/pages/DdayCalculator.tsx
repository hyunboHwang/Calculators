import { useMemo, useState } from 'react'
import { parseDate, todayStr, dday, fmtDate, addDays, addYears } from '../lib/age'
import { DateField } from '../components/ui'
import { useToday } from '../hooks/useToday'

type Mode = 'dday' | 'anniversary'

const milestones = [100, 200, 300, 500, 1000, 2000, 3000]

export default function DdayCalculator() {
  const [mode, setMode] = useState<Mode>('dday')
  const [targetStr, setTargetStr] = useState(todayStr())
  const [startStr, setStartStr] = useState(todayStr())

  const todayS = useToday()
  const today = parseDate(todayS)!

  const target = useMemo(() => {
    const t = parseDate(targetStr)
    if (!t) return null
    return { date: t, d: dday(t, today) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetStr, todayS])

  const anniv = useMemo(() => {
    const s = parseDate(startStr)
    if (!s) return null
    const daysSince = -dday(s, today) + 1 // 시작일 = 1일째
    const events = [
      ...milestones.map((m) => ({
        name: `${m.toLocaleString('ko-KR')}일`,
        date: addDays(s, m - 1),
      })),
      ...[1, 2, 3, 5, 10].map((y) => ({ name: `${y}주년`, date: addYears(s, y) })),
    ]
      .map((e) => ({ ...e, d: dday(e.date, today) }))
      .sort((a, b) => a.date.getTime() - b.date.getTime())
    return { daysSince, events }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startStr, todayS])

  return (
    <div>
      <h1 className="text-2xl font-bold">디데이 계산기</h1>
      <p className="mt-1 mb-6 text-sm text-muted">
        시험·기념일까지 남은 날짜와 사귄 지 며칠째인지, 100일·1000일·주년 날짜까지
        계산합니다.
      </p>

      <div className="mb-6 flex gap-1 bg-tint p-1 sm:w-fit">
        {(
          [
            ['dday', '디데이 (남은 날)'],
            ['anniversary', '기념일 (며칠째)'],
          ] as [Mode, string][]
        ).map(([m, label]) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`flex-1 px-4 py-2 text-sm font-medium transition-colors sm:flex-none ${
              mode === m ? 'bg-ink text-paper' : 'text-muted'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {mode === 'dday' ? (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          <section className="h-fit border border-rule bg-paper p-5">
            <DateField label="목표 날짜" value={targetStr} onChange={setTargetStr} />
          </section>
          <section>
            {target && (
              <div className="border border-accent bg-tint p-6 text-center">
                <p className="text-sm text-muted">{fmtDate(target.date)}</p>
                <p className="mt-2 text-5xl font-bold font-serif tabular-nums text-ink">
                  {target.d === 0 ? 'D-DAY' : target.d > 0 ? `D-${target.d}` : `D+${-target.d}`}
                </p>
                <p className="mt-3 text-sm text-body">
                  {target.d > 0
                    ? `오늘부터 ${target.d.toLocaleString('ko-KR')}일 남았습니다.`
                    : target.d === 0
                      ? '바로 오늘입니다!'
                      : `${(-target.d).toLocaleString('ko-KR')}일 지났습니다.`}
                </p>
              </div>
            )}
          </section>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          <section className="h-fit space-y-4">
            <div className="border border-rule bg-paper p-5">
              <DateField label="시작일 (사귄 날, 만난 날)" value={startStr} onChange={setStartStr} />
              <p className="mt-2 text-xs text-muted">시작일을 1일째로 계산합니다.</p>
            </div>
            {anniv && (
              <div className="border border-accent bg-tint p-6 text-center">
                <p className="text-sm text-muted">오늘은</p>
                <p className="mt-1 text-4xl font-bold font-serif tabular-nums text-ink">
                  {anniv.daysSince.toLocaleString('ko-KR')}일째
                </p>
              </div>
            )}
          </section>
          <section className="border border-rule bg-paper p-5">
            <h2 className="mb-3 text-base font-semibold">기념일 날짜</h2>
            {anniv && (
              <div className="divide-y divide-rule">
                {anniv.events.map((e) => (
                  <div key={e.name} className="flex items-center justify-between py-2">
                    <span
                      className={`text-sm font-semibold ${e.d < 0 ? 'text-muted' : 'text-ink'}`}
                    >
                      {e.name}
                    </span>
                    <span className="text-right">
                      <span
                        className={`text-sm tabular-nums ${e.d < 0 ? 'text-muted' : 'text-ink'}`}
                      >
                        {fmtDate(e.date)}
                      </span>
                      <span
                        className={`ml-2 text-xs font-semibold tabular-nums ${
                          e.d < 0 ? 'text-muted' : 'text-accent'
                        }`}
                      >
                        {e.d === 0 ? 'D-DAY' : e.d > 0 ? `D-${e.d}` : '지남'}
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  )
}
