import { useMemo, useState } from 'react'
import { equalMonthly, maxPrincipal } from '../lib/loan'
import { Field, Row, fmt, fmtPct } from '../components/ui'

export default function DsrCalculator() {
  const [annualIncome, setAnnualIncome] = useState(50_000_000)
  const [existingMonthly, setExistingMonthly] = useState(0)
  const [newLoan, setNewLoan] = useState(300_000_000)
  const [rate, setRate] = useState(4.0)
  const [years, setYears] = useState(30)
  const [useStress, setUseStress] = useState(true)
  const [stressAdd, setStressAdd] = useState(1.5)

  const r = useMemo(() => {
    const months = Math.round(years * 12)
    const actualMonthly = equalMonthly(newLoan, rate, months)
    const dsrRate = useStress ? rate + stressAdd : rate
    const dsrMonthly = equalMonthly(newLoan, dsrRate, months)

    const annualRepay = (existingMonthly + dsrMonthly) * 12
    const dsr = annualIncome > 0 ? (annualRepay / annualIncome) * 100 : NaN

    // 은행권 DSR 40% 기준 최대 신규 대출 (스트레스 금리로 역산)
    const roomMonthly = Math.max((annualIncome * 0.4) / 12 - existingMonthly, 0)
    const maxLoan = maxPrincipal(roomMonthly, dsrRate, months)

    return { months, actualMonthly, dsrMonthly, dsrRate, dsr, maxLoan }
  }, [annualIncome, existingMonthly, newLoan, rate, years, useStress, stressAdd])

  const verdict =
    r.dsr <= 40
      ? { label: '은행권 가능 범위', style: 'border-emerald-200 bg-emerald-50', badge: 'bg-emerald-600' }
      : r.dsr <= 50
        ? { label: '은행권 초과 · 2금융권 검토', style: 'border-amber-200 bg-amber-50', badge: 'bg-amber-500' }
        : { label: '한도 초과 · 대출 곤란', style: 'border-red-200 bg-red-50', badge: 'bg-red-600' }

  return (
    <div>
      <h1 className="text-2xl font-bold">DSR 계산기</h1>
      <p className="mt-1 mb-6 text-sm text-slate-500">
        연소득 대비 연간 원리금 상환 비율(DSR)로 대출 가능 여부를 판단합니다. 은행권 40%,
        2금융권 50% 한도가 기본 규제입니다.
      </p>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <section className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-base font-semibold">소득 · 대출 정보</h2>
          <div className="space-y-4">
            <Field
              label="연소득 (세전)"
              value={annualIncome}
              onChange={setAnnualIncome}
              step={1_000_000}
            />
            <Field
              label="기존 대출 월 상환액"
              value={existingMonthly}
              onChange={setExistingMonthly}
              step={100_000}
              hint="모든 대출 원리금 합계"
            />
            <Field label="신규 대출 금액" value={newLoan} onChange={setNewLoan} step={10_000_000} />
            <div className="grid grid-cols-2 gap-x-3">
              <Field label="연 금리" value={rate} onChange={setRate} suffix="%" step={0.1} />
              <Field label="기간" value={years} onChange={setYears} suffix="년" step={1} />
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={useStress}
                  onChange={(e) => setUseStress(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 accent-emerald-600"
                />
                스트레스 금리 가산 반영
              </label>
              {useStress && (
                <div className="mt-2">
                  <Field
                    label="가산 금리"
                    value={stressAdd}
                    onChange={setStressAdd}
                    suffix="%p"
                    step={0.1}
                    hint="기본 1.5%p"
                  />
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className={`rounded-2xl border p-5 ${verdict.style}`}>
            <div className="flex flex-wrap items-center gap-3">
              <span className={`shrink-0 rounded-full px-3 py-1 text-sm font-bold whitespace-nowrap text-white ${verdict.badge}`}>
                {verdict.label}
              </span>
              <span className="text-3xl font-extrabold tabular-nums">{fmtPct(r.dsr)}</span>
              <span className="text-sm text-slate-500">DSR</span>
            </div>
            <p className="mt-3 text-sm text-slate-600">
              연간 원리금 상환액 {fmt((existingMonthly + r.dsrMonthly) * 12)}원 ÷ 연소득{' '}
              {fmt(annualIncome)}원
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-2 text-base font-semibold">상세</h2>
            <div className="divide-y divide-slate-100">
              <Row label="신규 대출 실제 월 상환액" value={`${fmt(r.actualMonthly)}원`} strong />
              {useStress && (
                <Row
                  label="DSR 산정용 월 상환액"
                  value={`${fmt(r.dsrMonthly)}원`}
                  sub={`스트레스 금리 ${r.dsrRate.toFixed(1)}% 적용`}
                />
              )}
              <Row label="기존 대출 월 상환액" value={`${fmt(existingMonthly)}원`} />
              <Row
                label="은행권(40%) 기준 최대 대출 가능액"
                value={`약 ${fmt(r.maxLoan)}원`}
                strong
              />
            </div>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-relaxed text-amber-800">
            참고용 추정치입니다. 스트레스 DSR 가산 금리는 대출 종류(주담대/신용)·변동/고정
            여부·시행 단계에 따라 다르게 적용되며, 소득 산정 방식과 규제 지역 여부에 따라
            실제 한도가 달라집니다. 정확한 한도는 은행 심사에서 확정됩니다.
          </div>
        </section>
      </div>
    </div>
  )
}
