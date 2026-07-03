import { useMemo, useState } from 'react'
import { Field, Row, fmt } from '../components/ui'

const DIVIDEND_TAX = 0.154 // 배당소득세 14% + 지방세 1.4%

export default function DividendCalculator() {
  const [invested, setInvested] = useState(50_000_000)
  const [yieldPct, setYieldPct] = useState(4)
  const [targetMonthly, setTargetMonthly] = useState(1_000_000)

  const r = useMemo(() => {
    const annualGross = invested * (yieldPct / 100)
    const annualNet = annualGross * (1 - DIVIDEND_TAX)
    // 목표 월 배당(세후) 역산
    const needed =
      yieldPct > 0 ? (targetMonthly * 12) / ((yieldPct / 100) * (1 - DIVIDEND_TAX)) : NaN
    return {
      annualGross,
      tax: annualGross * DIVIDEND_TAX,
      annualNet,
      monthlyNet: annualNet / 12,
      needed,
      overThreshold: annualGross > 20_000_000,
    }
  }, [invested, yieldPct, targetMonthly])

  return (
    <div>
      <h1 className="text-2xl font-bold">배당금 계산기</h1>
      <p className="mt-1 mb-6 text-sm text-slate-500">
        투자금과 배당수익률로 세후 배당금을 계산하고, 목표 월 배당에 필요한 투자금을
        역산합니다. 배당소득세 15.4% 반영.
      </p>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <section className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-base font-semibold">투자 정보</h2>
          <div className="space-y-4">
            <Field label="투자금액" value={invested} onChange={setInvested} step={1_000_000} />
            <Field
              label="연 배당수익률"
              value={yieldPct}
              onChange={setYieldPct}
              suffix="%"
              step={0.1}
              hint="시가배당률 기준"
            />
            <div className="border-t border-slate-100 pt-4">
              <Field
                label="목표 월 배당금 (세후)"
                value={targetMonthly}
                onChange={setTargetMonthly}
                step={100_000}
                hint="필요 투자금 역산용"
              />
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-sm text-slate-500">월평균 배당금 (세후)</p>
                <p className="text-3xl font-extrabold tabular-nums text-emerald-700">
                  {fmt(r.monthlyNet)}원
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-slate-500">연 배당금 (세후)</p>
                <p className="text-lg font-bold tabular-nums">{fmt(r.annualNet)}원</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-2 text-base font-semibold">상세 내역</h2>
            <div className="divide-y divide-slate-100">
              <Row label="연 배당금 (세전)" value={`${fmt(r.annualGross)}원`} />
              <Row label="배당소득세 (15.4%)" value={`-${fmt(r.tax)}원`} />
              <Row label="연 배당금 (세후)" value={`${fmt(r.annualNet)}원`} strong />
              <Row label="월평균 (세후)" value={`${fmt(r.monthlyNet)}원`} strong />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-2 text-base font-semibold">목표 배당 역산</h2>
            <p className="text-sm leading-relaxed text-slate-600">
              세후 월 <b>{fmt(targetMonthly)}원</b>을 배당으로 받으려면 배당수익률{' '}
              {yieldPct}% 기준 약{' '}
              <b className="text-emerald-700">{fmt(r.needed)}원</b>을 투자해야 합니다.
            </p>
          </div>

          {r.overThreshold && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-relaxed text-amber-800">
              연간 금융소득(이자+배당)이 2,000만원을 초과하면 금융소득종합과세 대상이 되어
              다른 소득과 합산 과세됩니다. 지금 계산된 세전 배당금이 이 기준을 넘으니 실제
              세부담은 15.4%보다 커질 수 있습니다.
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
