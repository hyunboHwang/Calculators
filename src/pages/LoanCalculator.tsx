import { useMemo, useState } from 'react'
import { amortize, REPAY_LABELS, type RepayType } from '../lib/loan'
import { Field, fmt } from '../components/ui'

const types: RepayType[] = ['equalPayment', 'equalPrincipal', 'bullet']

export default function LoanCalculator() {
  const [principal, setPrincipal] = useState(300_000_000)
  const [rate, setRate] = useState(4.0)
  const [years, setYears] = useState(30)
  const [selected, setSelected] = useState<RepayType>('equalPayment')
  const [showAll, setShowAll] = useState(false)

  const months = Math.round(years * 12)

  const results = useMemo(
    () =>
      Object.fromEntries(types.map((t) => [t, amortize(principal, rate, months, t)])) as Record<
        RepayType,
        ReturnType<typeof amortize>
      >,
    [principal, rate, months],
  )

  const sel = results[selected]
  const rows = showAll ? sel.schedule : sel.schedule.slice(0, 12)

  return (
    <div>
      <h1 className="text-2xl font-bold">대출 상환 계산기</h1>
      <p className="mt-1 mb-6 text-sm text-slate-500">
        원리금균등 · 원금균등 · 만기일시 세 가지 방식의 월 상환액과 총이자를 비교합니다.
      </p>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <section className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-base font-semibold">대출 조건</h2>
          <div className="space-y-4">
            <Field label="대출 금액" value={principal} onChange={setPrincipal} step={10_000_000} />
            <div className="grid grid-cols-2 gap-x-3">
              <Field label="연 금리" value={rate} onChange={setRate} suffix="%" step={0.1} />
              <Field label="대출 기간" value={years} onChange={setYears} suffix="년" step={1} />
            </div>
          </div>
        </section>

        <section className="space-y-4">
          {/* 방식 비교 */}
          <div className="grid gap-3 sm:grid-cols-3">
            {types.map((t) => {
              const r = results[t]
              const active = selected === t
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setSelected(t)}
                  className={`rounded-2xl border p-4 text-left transition-colors ${
                    active
                      ? 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-200'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <p className="text-xs font-semibold text-slate-500">{REPAY_LABELS[t]}</p>
                  <p className="mt-1 text-base font-extrabold tabular-nums xl:text-lg">
                    {t === 'equalPayment'
                      ? `월 ${fmt(r.firstPayment)}원`
                      : t === 'equalPrincipal'
                        ? `첫 달 ${fmt(r.firstPayment)}원`
                        : `월 이자 ${fmt(r.schedule[0]?.interest ?? 0)}원`}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    총 이자 <b className="tabular-nums">{fmt(r.totalInterest)}원</b>
                  </p>
                </button>
              )
            })}
          </div>

          {/* 선택 방식 요약 */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-base font-semibold">
              {REPAY_LABELS[selected]} — 상환 요약
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {(
                [
                  ['첫 달 상환액', sel.firstPayment],
                  ['마지막 달', sel.lastPayment],
                  ['총 이자', sel.totalInterest],
                  ['총 상환액', sel.totalPayment],
                ] as [string, number][]
              ).map(([label, v]) => (
                <div key={label} className="rounded-xl bg-slate-50 p-3">
                  <p className="text-xs text-slate-400">{label}</p>
                  <p className="mt-0.5 text-sm font-bold tabular-nums">{fmt(v)}원</p>
                </div>
              ))}
            </div>
          </div>

          {/* 스케줄 */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-semibold">월별 상환 스케줄</h2>
              <button
                type="button"
                onClick={() => setShowAll((v) => !v)}
                className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100"
              >
                {showAll ? '12개월만 보기' : `전체 ${months}회차 보기`}
              </button>
            </div>
            <div className={showAll ? 'max-h-96 overflow-y-auto' : ''}>
              <table className="w-full text-right text-xs tabular-nums">
                <thead className="sticky top-0 bg-white text-slate-400">
                  <tr className="border-b border-slate-200">
                    <th className="py-1.5 pr-2 font-medium">회차</th>
                    <th className="py-1.5 pr-2 font-medium">상환금</th>
                    <th className="py-1.5 pr-2 font-medium">원금</th>
                    <th className="py-1.5 pr-2 font-medium">이자</th>
                    <th className="py-1.5 font-medium">잔액</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.month} className="border-b border-slate-50 text-slate-600">
                      <td className="py-1 pr-2 text-slate-400">{row.month}</td>
                      <td className="py-1 pr-2">{fmt(row.payment)}</td>
                      <td className="py-1 pr-2">{fmt(row.principal)}</td>
                      <td className="py-1 pr-2">{fmt(row.interest)}</td>
                      <td className="py-1">{fmt(row.balance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
