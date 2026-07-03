import { useMemo, useState } from 'react'
import { calcSalary } from '../lib/salary'
import { Field, Row, fmt } from '../components/ui'

const raisePresets = [3, 5, 7, 10, 15]

/** 만원 단위 반올림 */
const roundMan = (v: number) => Math.round(v / 10_000) * 10_000

export default function RaiseComparator() {
  const [current, setCurrent] = useState(40_000_000)
  const [after, setAfter] = useState(44_000_000)
  const [nonTaxableMonthly, setNonTaxableMonthly] = useState(200_000)
  const [dependents, setDependents] = useState(1)
  const [children, setChildren] = useState(0)

  const shared = { nonTaxableMonthly, dependents, children, withholdingRatio: 100 as const }

  const { before, next } = useMemo(
    () => ({
      before: calcSalary({ annualSalary: current, ...shared }),
      next: calcSalary({ annualSalary: after, ...shared }),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [current, after, nonTaxableMonthly, dependents, children],
  )

  const raiseAmount = after - current
  const raisePct = current > 0 ? (raiseAmount / current) * 100 : NaN
  const monthlyDiff = next.monthlyNet - before.monthlyNet
  const annualDiff = next.annualNet - before.annualNet
  const takeHomeRatio = raiseAmount > 0 ? (annualDiff / raiseAmount) * 100 : NaN

  return (
    <div>
      <h1 className="text-2xl font-bold">연봉 인상 비교기</h1>
      <p className="mt-1 mb-6 text-sm text-slate-500">
        연봉이 오르면 실수령액이 실제로 얼마나 느는지 비교합니다. 세금·보험료 증가분을 뺀
        체감 인상액을 확인하세요.
      </p>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        {/* 입력 */}
        <section className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-base font-semibold">연봉 정보</h2>
          <div className="space-y-4">
            <Field label="현재 연봉" value={current} onChange={setCurrent} step={1_000_000} />
            <div>
              <Field label="인상 후 연봉" value={after} onChange={setAfter} step={1_000_000} />
              <div className="mt-2 flex flex-wrap gap-1.5">
                {raisePresets.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setAfter(roundMan(current * (1 + p / 100)))}
                    className="rounded-full border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-100"
                  >
                    +{p}%
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-4">
              <Field
                label="비과세 월액"
                value={nonTaxableMonthly}
                onChange={setNonTaxableMonthly}
                step={10000}
              />
              <Field
                label="부양가족 수"
                value={dependents}
                onChange={(v) => setDependents(Math.max(1, Math.round(v)))}
                suffix="명"
                step={1}
                hint="본인 포함"
              />
              <Field
                label="8~20세 자녀 수"
                value={children}
                onChange={(v) => setChildren(Math.max(0, Math.round(v)))}
                suffix="명"
                step={1}
              />
            </div>
          </div>
        </section>

        {/* 결과 */}
        <section className="space-y-4">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
            <p className="text-sm text-slate-500">
              연봉 {fmt(raiseAmount)}원 ({Number.isFinite(raisePct) ? raisePct.toFixed(1) : '-'}%)
              인상 시 월 실수령액은
            </p>
            <p className="mt-1 text-3xl font-extrabold tabular-nums text-emerald-700">
              {monthlyDiff >= 0 ? '+' : ''}
              {fmt(monthlyDiff)}원
            </p>
            {raiseAmount > 0 && (
              <p className="mt-3 text-sm text-slate-600">
                인상분 중 실제로 손에 들어오는 비율은 <b>{takeHomeRatio.toFixed(1)}%</b>
                입니다. 나머지는 세금과 보험료로 나갑니다.
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-base font-semibold">전 · 후 비교</h2>
            <div className="grid grid-cols-3 gap-2 border-b border-slate-100 pb-2 text-xs font-semibold text-slate-400">
              <span />
              <span className="text-right">현재</span>
              <span className="text-right">인상 후</span>
            </div>
            {(
              [
                ['월 세전급여', before.monthlyGross, next.monthlyGross],
                ['월 공제 합계', before.totalDeduction, next.totalDeduction],
                ['월 실수령액', before.monthlyNet, next.monthlyNet],
                ['연 실수령액', before.annualNet, next.annualNet],
              ] as [string, number, number][]
            ).map(([label, a, b], idx) => (
              <div
                key={label}
                className={`grid grid-cols-3 gap-2 py-2 text-sm ${
                  idx >= 2 ? 'font-semibold text-slate-800' : 'text-slate-500'
                } ${idx > 0 ? 'border-t border-slate-100' : ''}`}
              >
                <span>{label}</span>
                <span className="text-right tabular-nums">{fmt(a)}원</span>
                <span className="text-right tabular-nums">{fmt(b)}원</span>
              </div>
            ))}
            <div className="mt-2 rounded-lg bg-slate-50 p-3">
              <Row label="월 실수령 증가" value={`+${fmt(monthlyDiff)}원`} strong />
              <Row label="연 실수령 증가" value={`+${fmt(annualDiff)}원`} strong />
            </div>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-relaxed text-amber-800">
            간이세액표 산출방식 기준 예상치입니다. 소득 구간이 올라가면 한계세율이 높아져
            인상분의 체감 비율이 낮아질 수 있습니다.
          </div>
        </section>
      </div>
    </div>
  )
}
