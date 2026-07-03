import { useMemo, useState } from 'react'
import { insurances } from '../lib/salary'
import { Field, Row, fmt } from '../components/ui'

const MIN_WAGE_2026 = 10_320

type Deduct = 'none' | 'freelance' | 'insurance'

export default function PartTimeCalculator() {
  const [hourly, setHourly] = useState(MIN_WAGE_2026)
  const [weeklyHours, setWeeklyHours] = useState(20)
  const [deduct, setDeduct] = useState<Deduct>('none')

  const r = useMemo(() => {
    const holidayHours = weeklyHours >= 15 ? (Math.min(weeklyHours, 40) / 40) * 8 : 0
    const weeklyPay = hourly * weeklyHours
    const holidayPay = hourly * holidayHours
    // 월 소정근로시간: (주 근로 + 주휴) × 365/7/12 (주 40시간 → 209시간)
    const monthlyHours = Math.round(((weeklyHours + holidayHours) * 365) / 7 / 12)
    const monthlyGross = hourly * monthlyHours

    let deduction = 0
    if (deduct === 'freelance') deduction = monthlyGross * 0.033
    else if (deduct === 'insurance') deduction = insurances(monthlyGross).total

    return {
      holidayHours,
      weeklyPay,
      holidayPay,
      weeklyTotal: weeklyPay + holidayPay,
      monthlyHours,
      monthlyGross,
      deduction,
      monthlyNet: monthlyGross - deduction,
      belowMinWage: hourly < MIN_WAGE_2026,
    }
  }, [hourly, weeklyHours, deduct])

  return (
    <div>
      <h1 className="text-2xl font-bold">알바 월급 · 주휴수당 계산기</h1>
      <p className="mt-1 mb-6 text-sm text-slate-500">
        시급과 주 근무시간으로 주휴수당 포함 주급·월급을 계산합니다. 2026년 최저시급은{' '}
        {fmt(MIN_WAGE_2026)}원입니다.
      </p>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <section className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-base font-semibold">근무 조건</h2>
          <div className="space-y-4">
            <Field label="시급" value={hourly} onChange={setHourly} step={10} />
            <Field
              label="주 근무시간"
              value={weeklyHours}
              onChange={(v) => setWeeklyHours(Math.min(Math.max(v, 0), 52))}
              suffix="시간"
              step={1}
              hint="휴게시간 제외"
            />
            <div>
              <span className="mb-1 block text-sm font-medium text-slate-700">공제 방식</span>
              <div className="grid grid-cols-3 gap-1.5">
                {(
                  [
                    ['none', '공제 없음'],
                    ['freelance', '3.3%'],
                    ['insurance', '4대보험'],
                  ] as [Deduct, string][]
                ).map(([d, label]) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDeduct(d)}
                    className={`rounded-lg border px-2 py-2 text-sm font-medium transition-colors ${
                      deduct === d
                        ? 'border-emerald-600 bg-emerald-600 text-white'
                        : 'border-slate-300 text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          {r.belowMinWage && (
            <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
              입력한 시급이 2026년 최저시급({fmt(MIN_WAGE_2026)}원)보다 낮습니다. 최저임금법
              위반입니다.
            </p>
          )}
        </section>

        <section className="space-y-4">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-sm text-slate-500">예상 월급 {deduct !== 'none' && '(공제 후)'}</p>
                <p className="text-3xl font-extrabold tabular-nums text-emerald-700">
                  {fmt(r.monthlyNet)}원
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-slate-500">주급 (주휴 포함)</p>
                <p className="text-lg font-bold tabular-nums">{fmt(r.weeklyTotal)}원</p>
              </div>
            </div>
            {r.holidayHours === 0 && (
              <p className="mt-3 text-sm text-slate-600">
                주 15시간 미만 근무라 주휴수당이 발생하지 않습니다.
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-2 text-base font-semibold">계산 내역</h2>
            <div className="divide-y divide-slate-100">
              <Row label="주 근무 급여" value={`${fmt(r.weeklyPay)}원`} sub={`${weeklyHours}시간 × ${fmt(hourly)}원`} />
              <Row
                label="주휴수당"
                value={`${fmt(r.holidayPay)}원`}
                sub={r.holidayHours > 0 ? `주 ${r.holidayHours.toFixed(1)}시간분` : '주 15시간 미만'}
              />
              <Row label="월 환산 근로시간" value={`${r.monthlyHours}시간`} sub="주휴 포함, 4.345주 기준" />
              <Row label="월 세전 급여" value={`${fmt(r.monthlyGross)}원`} strong />
              {deduct !== 'none' && (
                <Row
                  label={deduct === 'freelance' ? '3.3% 원천징수' : '4대보험 (근로자 부담)'}
                  value={`-${fmt(r.deduction)}원`}
                />
              )}
              <Row label="월 실수령 예상" value={`${fmt(r.monthlyNet)}원`} strong />
            </div>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-relaxed text-amber-800">
            주휴수당은 1주 소정근로시간 15시간 이상 + 개근 시 발생합니다. 알바를 3.3%
            사업소득으로 처리하는 관행이 있으나 원칙적으로 근로자는 4대보험 대상입니다. 야간
            (22시~06시)·연장·휴일근로 가산수당(5인 이상 사업장 50%)은 별도입니다.
          </div>
        </section>
      </div>
    </div>
  )
}
