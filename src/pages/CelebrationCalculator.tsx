import { useMemo, useState } from 'react'
import { parseDate, todayStr, celebrations, dday, fmtDate } from '../lib/age'
import { DateField } from '../components/ui'

export default function CelebrationCalculator() {
  const [birthStr, setBirthStr] = useState('1960-01-01')

  const r = useMemo(() => {
    const birth = parseDate(birthStr)
    if (!birth) return null
    const today = parseDate(todayStr())!
    return celebrations(birth).map((c) => ({ ...c, d: dday(c.date, today) }))
  }, [birthStr])

  const upcoming = r?.find((c) => c.d >= 0)

  return (
    <div>
      <h1 className="text-2xl font-bold">환갑 · 칠순 · 팔순 계산기</h1>
      <p className="mt-1 mb-6 text-sm text-slate-500">
        백일부터 백수까지, 잔치 날짜를 한 번에 확인하세요. 환갑은 만 60세, 칠순부터는
        전통적으로 세는나이 기준입니다.
      </p>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <section className="h-fit space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-base font-semibold">생년월일 입력</h2>
            <DateField label="생년월일 (양력)" value={birthStr} onChange={setBirthStr} />
            <p className="mt-3 text-xs leading-relaxed text-slate-400">
              어르신 생신을 음력으로 챙기는 집이라면, 해당 연도의 음력 생신 날짜로 잔치
              날을 잡는 경우가 많습니다. 여기서는 양력 생일 기준으로 계산합니다.
            </p>
          </div>

          {upcoming && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
              <p className="text-sm text-slate-500">다가오는 기념일</p>
              <p className="mt-1 text-2xl font-extrabold text-emerald-700">{upcoming.name}</p>
              <p className="mt-1 text-sm text-slate-600">
                {fmtDate(upcoming.date)} ·{' '}
                <b>{upcoming.d === 0 ? 'D-DAY' : `D-${upcoming.d.toLocaleString('ko-KR')}`}</b>
              </p>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-base font-semibold">기념일 전체</h2>
          {!r ? (
            <p className="text-sm text-red-600">날짜를 확인해주세요.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {r.map((c) => (
                <div key={c.name} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className={`text-sm font-semibold ${c.d < 0 ? 'text-slate-400' : 'text-slate-800'}`}>
                      {c.name}
                    </p>
                    <p className="text-xs text-slate-400">{c.desc}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-medium tabular-nums ${c.d < 0 ? 'text-slate-400' : 'text-slate-800'}`}>
                      {fmtDate(c.date)}
                    </p>
                    <p className={`text-xs tabular-nums ${c.d < 0 ? 'text-slate-300' : 'font-semibold text-emerald-600'}`}>
                      {c.d === 0
                        ? 'D-DAY'
                        : c.d > 0
                          ? `D-${c.d.toLocaleString('ko-KR')}`
                          : `${Math.abs(c.d).toLocaleString('ko-KR')}일 지남`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
