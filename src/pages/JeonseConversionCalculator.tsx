import { useMemo, useState } from 'react'
import { calcJeonseConversion } from '../lib/jeonseConversion'
import { Field, Row, fmt, fmtPct } from '../components/ui'

export default function JeonseConversionCalculator() {
  const [jeonseDeposit, setJeonseDeposit] = useState(300_000_000)
  const [monthlyDeposit, setMonthlyDeposit] = useState(50_000_000)
  const [monthlyRent, setMonthlyRent] = useState(1_000_000)
  const [baseRate, setBaseRate] = useState(3.5)

  const r = useMemo(
    () => calcJeonseConversion({ jeonseDeposit, monthlyDeposit, monthlyRent, baseRate }),
    [jeonseDeposit, monthlyDeposit, monthlyRent, baseRate],
  )

  return (
    <div>
      <h1 className="text-2xl font-bold">전월세 전환율 계산기</h1>
      <p className="mt-1 mb-6 text-sm text-slate-500">
        전세보증금과 월세 전환 조건을 비교해 법정 전환율 상한을 넘는지 확인합니다. 상한은
        한국은행 기준금리+2%p와 연 10% 중 낮은 값입니다.
      </p>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <section className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-base font-semibold">계약 조건</h2>
          <div className="space-y-4">
            <Field
              label="전세보증금"
              value={jeonseDeposit}
              onChange={setJeonseDeposit}
              step={10_000_000}
            />
            <Field
              label="월세 전환 시 보증금"
              value={monthlyDeposit}
              onChange={setMonthlyDeposit}
              step={10_000_000}
            />
            <Field label="월세" value={monthlyRent} onChange={setMonthlyRent} step={10_000} />
            <Field
              label="기준금리"
              value={baseRate}
              onChange={setBaseRate}
              suffix="%"
              step={0.1}
              hint="한국은행 기준금리"
            />
          </div>
        </section>

        <section className="space-y-4">
          <div
            className={`rounded-2xl border p-5 ${
              r.isOverCap ? 'border-red-200 bg-red-50' : 'border-emerald-200 bg-emerald-50'
            }`}
          >
            <p className="text-sm text-slate-500">현재 조건의 전환율</p>
            <p className="text-3xl font-extrabold tabular-nums text-slate-800">
              {fmtPct(r.actualRate)}
            </p>
            <p className="mt-2 text-sm text-slate-600">
              법정 상한 {fmtPct(r.legalCapRate)} {r.isOverCap ? '초과' : '이내'}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-2 text-base font-semibold">상세</h2>
            <div className="divide-y divide-slate-100">
              <Row label="보증금 차액" value={`${fmt(r.depositDiff)}원`} />
              <Row label="법정 상한 기준 월세" value={`${fmt(r.capMonthlyRent)}원`} strong />
            </div>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-relaxed text-amber-800">
            <b>이 계산은 참고용입니다.</b> 법정 상한은 신규 계약이 아닌 계약갱신 시 증액 제한에
            적용되는 기준입니다. 신규 계약의 전월세 전환은 당사자 합의로 정해집니다.
          </div>
        </section>
      </div>
    </div>
  )
}
