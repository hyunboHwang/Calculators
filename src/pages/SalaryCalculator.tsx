import { useMemo, useState } from 'react'
import { calcSalary, RATES_2026, type SalaryInput } from '../lib/salary'
import { Field, Row, fmt } from '../components/ui'

/* ---------- 페이지 ---------- */

const presets = [30_000_000, 40_000_000, 50_000_000, 60_000_000, 80_000_000, 100_000_000]

export default function SalaryCalculator() {
  const [input, setInput] = useState<SalaryInput>({
    annualSalary: 40_000_000,
    nonTaxableMonthly: 200_000,
    dependents: 1,
    children: 0,
    withholdingRatio: 100,
  })

  const set = <K extends keyof SalaryInput>(k: K) => (v: SalaryInput[K]) =>
    setInput((prev) => ({ ...prev, [k]: v }))

  const r = useMemo(() => calcSalary(input), [input])

  return (
    <div>
      <h1 className="text-2xl font-bold">연봉 실수령액 계산기</h1>
      <p className="mt-1 mb-6 text-sm text-slate-500">
        2026년 4대보험 요율과 근로소득 간이세액표 산출방식을 반영한 예상치입니다.
      </p>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        {/* 입력 */}
        <section className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-base font-semibold">급여 정보 입력</h2>

          <Field
            label="연봉 (세전)"
            value={input.annualSalary}
            onChange={set('annualSalary')}
            step={1_000_000}
          />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {presets.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => set('annualSalary')(p)}
                className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                  input.annualSalary === p
                    ? 'border-emerald-600 bg-emerald-600 text-white'
                    : 'border-slate-200 text-slate-500 hover:bg-slate-100'
                }`}
              >
                {p / 10_000_000}천만
              </button>
            ))}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-x-3 gap-y-4">
            <Field
              label="비과세 월액"
              value={input.nonTaxableMonthly}
              onChange={set('nonTaxableMonthly')}
              hint="식대 등, 보통 20만"
            />
            <Field
              label="부양가족 수"
              value={input.dependents}
              onChange={(v) => set('dependents')(Math.max(1, Math.round(v)))}
              suffix="명"
              step={1}
              hint="본인 포함"
            />
            <Field
              label="8~20세 자녀 수"
              value={input.children}
              onChange={(v) => set('children')(Math.max(0, Math.round(v)))}
              suffix="명"
              step={1}
            />
            <div>
              <span className="mb-1 block text-sm font-medium text-slate-700">원천징수 비율</span>
              <div className="flex gap-1">
                {([80, 100, 120] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => set('withholdingRatio')(p)}
                    className={`flex-1 rounded-lg border px-2 py-2 text-sm font-medium transition-colors ${
                      input.withholdingRatio === p
                        ? 'border-emerald-600 bg-emerald-600 text-white'
                        : 'border-slate-300 text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    {p}%
                  </button>
                ))}
              </div>
            </div>
          </div>

          <p className="mt-4 text-xs leading-relaxed text-slate-400">
            원천징수 비율은 매월 떼는 소득세의 비율 선택지(80/100/120%)로, 연말정산에서
            정산되므로 연간 총 세금은 같습니다.
          </p>
        </section>

        {/* 결과 */}
        <section className="space-y-4">
          {/* 요약 */}
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-sm text-slate-500">월 예상 실수령액</p>
                <p className="text-3xl font-extrabold tabular-nums text-emerald-700">
                  {fmt(r.monthlyNet)}원
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-slate-500">연 예상 실수령액</p>
                <p className="text-lg font-bold tabular-nums">{fmt(r.annualNet)}원</p>
              </div>
            </div>
            <p className="mt-3 text-sm text-slate-600">
              연봉의 <b>{(r.netRatio * 100).toFixed(1)}%</b>를 실수령하고, 매월{' '}
              <b>{fmt(r.totalDeduction)}원</b>이 공제됩니다.
            </p>
          </div>

          {/* 공제 내역 */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-2 text-base font-semibold">월 공제 내역</h2>
            <div className="divide-y divide-slate-100">
              <Row label="월 세전급여" value={`${fmt(r.monthlyGross)}원`} strong />
              <Row
                label="과세 대상 월급여"
                value={`${fmt(r.monthlyTaxable)}원`}
                sub={`비과세 ${fmt(input.nonTaxableMonthly)}원 제외`}
              />
              <Row
                label="국민연금"
                value={`-${fmt(r.pension)}원`}
                sub={`${(RATES_2026.pensionEmployee * 100).toFixed(2)}% · 상한 적용`}
              />
              <Row
                label="건강보험"
                value={`-${fmt(r.health)}원`}
                sub={`${(RATES_2026.healthEmployee * 100).toFixed(3)}%`}
              />
              <Row
                label="장기요양보험"
                value={`-${fmt(r.care)}원`}
                sub={`건강보험료의 ${(RATES_2026.longTermCareOfHealth * 100).toFixed(2)}%`}
              />
              <Row
                label="고용보험"
                value={`-${fmt(r.employment)}원`}
                sub={`${(RATES_2026.employmentEmployee * 100).toFixed(1)}%`}
              />
              <Row
                label="소득세"
                value={`-${fmt(r.incomeTax)}원`}
                sub={`간이세액표 기준 · ${input.withholdingRatio}%`}
              />
              <Row label="지방소득세" value={`-${fmt(r.localTax)}원`} sub="소득세의 10%" />
              <Row label="공제 합계" value={`-${fmt(r.totalDeduction)}원`} strong />
              <Row label="월 예상 실수령액" value={`${fmt(r.monthlyNet)}원`} strong />
            </div>
          </div>

          {/* 안내 */}
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-relaxed text-amber-800">
            <b>이 계산은 예상치입니다.</b> 소득세는 국세청 근로소득 간이세액표의 산출방식을
            따른 근사값으로, 회사의 비과세 항목 구성, 상여 지급 방식, 연말정산 결과에 따라
            실제 수령액과 달라질 수 있습니다. 국민연금은 기준소득월액 하한{' '}
            {fmt(RATES_2026.pensionFloorMonthly)}원 / 상한 {fmt(RATES_2026.pensionCapMonthly)}원
            (2026.7~2027.6)을 반영했습니다.
          </div>
        </section>
      </div>
    </div>
  )
}
