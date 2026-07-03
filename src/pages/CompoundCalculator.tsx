import { useMemo, useState } from 'react'
import { Field, fmt } from '../components/ui'

export default function CompoundCalculator() {
  const [principal, setPrincipal] = useState(10_000_000)
  const [monthly, setMonthly] = useState(500_000)
  const [ratePct, setRatePct] = useState(7)
  const [years, setYears] = useState(20)

  const r = useMemo(() => {
    const months = Math.round(years * 12)
    const mr = ratePct / 100 / 12
    const yearly: { year: number; value: number; paid: number }[] = []
    let value = principal
    for (let m = 1; m <= months; m++) {
      value = value * (1 + mr) + monthly
      if (m % 12 === 0) {
        yearly.push({ year: m / 12, value, paid: principal + monthly * m })
      }
    }
    const totalPaid = principal + monthly * months
    const profit = value - totalPaid
    return { final: value, totalPaid, profit, multiple: totalPaid > 0 ? value / totalPaid : NaN, yearly }
  }, [principal, monthly, ratePct, years])

  return (
    <div>
      <h1 className="text-2xl font-bold">복리 계산기</h1>
      <p className="mt-1 mb-6 text-sm text-slate-500">
        초기 원금과 월 적립액이 연 수익률로 굴러가면 얼마가 되는지 월복리 기준으로
        계산합니다.
      </p>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <section className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-base font-semibold">투자 조건</h2>
          <div className="space-y-4">
            <Field label="초기 원금" value={principal} onChange={setPrincipal} step={1_000_000} />
            <Field label="월 적립액" value={monthly} onChange={setMonthly} step={100_000} />
            <div className="grid grid-cols-2 gap-x-3">
              <Field label="연 수익률" value={ratePct} onChange={setRatePct} suffix="%" step={0.5} />
              <Field
                label="투자 기간"
                value={years}
                onChange={(v) => setYears(Math.min(Math.max(Math.round(v), 1), 50))}
                suffix="년"
                step={1}
              />
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
            <p className="text-sm text-slate-500">{years}년 후 예상 자산</p>
            <p className="mt-1 text-3xl font-extrabold tabular-nums text-emerald-700">
              {fmt(r.final)}원
            </p>
            <p className="mt-2 text-sm text-slate-600">
              총 납입 {fmt(r.totalPaid)}원 → <b>{r.multiple.toFixed(2)}배</b> · 수익{' '}
              <b>+{fmt(r.profit)}원</b>
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-2 text-base font-semibold">연도별 자산 추이</h2>
            <div className="max-h-80 overflow-y-auto">
              <table className="w-full text-right text-xs tabular-nums">
                <thead className="sticky top-0 bg-white text-slate-400">
                  <tr className="border-b border-slate-200">
                    <th className="py-1.5 pr-2 font-medium">연차</th>
                    <th className="py-1.5 pr-2 font-medium">납입 누계</th>
                    <th className="py-1.5 pr-2 font-medium">평가 자산</th>
                    <th className="py-1.5 font-medium">수익</th>
                  </tr>
                </thead>
                <tbody>
                  {r.yearly.map((y) => (
                    <tr key={y.year} className="border-b border-slate-50 text-slate-600">
                      <td className="py-1 pr-2 text-slate-400">{y.year}년</td>
                      <td className="py-1 pr-2">{fmt(y.paid)}</td>
                      <td className="py-1 pr-2 font-medium">{fmt(y.value)}</td>
                      <td className="py-1 text-red-600">+{fmt(y.value - y.paid)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-relaxed text-amber-800">
            매월 말 적립, 월복리 가정의 단순 시뮬레이션입니다. 실제 투자는 수익률이 매년
            변동하고 세금·수수료가 발생하므로 결과와 다를 수 있습니다. 특정 수익률을 보장하는
            것이 아닙니다.
          </div>
        </section>
      </div>
    </div>
  )
}
