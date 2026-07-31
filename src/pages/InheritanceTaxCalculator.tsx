import { useMemo, useState } from 'react'
import { calcInheritanceTax } from '../lib/inheritanceTax'
import { Field, Row, fmt } from '../components/ui'

export default function InheritanceTaxCalculator() {
  const [estateValue, setEstateValue] = useState(1_000_000_000)
  const [debtAndFuneralCost, setDebtAndFuneralCost] = useState(0)
  const [hasSpouse, setHasSpouse] = useState(true)
  const [spouseActualShare, setSpouseActualShare] = useState(0)
  const [childrenCount, setChildrenCount] = useState(2)
  const [minorHeirsCount, setMinorHeirsCount] = useState(0)
  const [minorRemainingYears, setMinorRemainingYears] = useState(10)
  const [elderlyHeirsCount, setElderlyHeirsCount] = useState(0)
  const [disabledHeirsCount, setDisabledHeirsCount] = useState(0)
  const [disabledRemainingYears, setDisabledRemainingYears] = useState(20)
  const [netFinancialAssets, setNetFinancialAssets] = useState(0)

  const r = useMemo(
    () =>
      calcInheritanceTax({
        estateValue,
        debtAndFuneralCost,
        hasSpouse,
        spouseActualShare,
        childrenCount,
        minorHeirsCount,
        minorRemainingYears,
        elderlyHeirsCount,
        disabledHeirsCount,
        disabledRemainingYears,
        netFinancialAssets,
      }),
    [
      estateValue,
      debtAndFuneralCost,
      hasSpouse,
      spouseActualShare,
      childrenCount,
      minorHeirsCount,
      minorRemainingYears,
      elderlyHeirsCount,
      disabledHeirsCount,
      disabledRemainingYears,
      netFinancialAssets,
    ],
  )

  return (
    <div>
      <h1 className="text-2xl font-bold">상속세 계산기</h1>
      <p className="mt-1 mb-6 text-sm text-slate-500">
        상속재산가액과 상속인 구성으로 상속세를 추정합니다. 배우자 법정상속분 정밀 계산,
        사전증여재산 합산, 재산평가 특례는 반영하지 않은 간이 계산입니다.
      </p>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <section className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-base font-semibold">상속재산 · 상속인 정보</h2>
          <div className="space-y-4">
            <Field
              label="상속재산가액"
              value={estateValue}
              onChange={setEstateValue}
              step={10_000_000}
              hint="부동산·예금·주식 등 상속재산 총액"
            />
            <Field
              label="채무·공과금·장례비용"
              value={debtAndFuneralCost}
              onChange={setDebtAndFuneralCost}
              step={1_000_000}
              hint="상속재산가액에서 먼저 차감되는 금액"
            />
            <div className="rounded-xl bg-slate-50 p-3">
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={hasSpouse}
                  onChange={(e) => setHasSpouse(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 accent-emerald-600"
                />
                배우자 생존
              </label>
            </div>
            {hasSpouse && (
              <Field
                label="배우자 실제 상속액"
                value={spouseActualShare}
                onChange={setSpouseActualShare}
                step={10_000_000}
                hint="미입력(0)이면 최소 배우자공제 5억원 적용"
              />
            )}
            <div className="grid grid-cols-2 gap-3">
              <Field
                label="자녀 수"
                value={childrenCount}
                onChange={(v) => setChildrenCount(Math.max(0, Math.round(v)))}
                suffix="명"
                step={1}
              />
              <Field
                label="65세 이상 상속인"
                value={elderlyHeirsCount}
                onChange={(v) => setElderlyHeirsCount(Math.max(0, Math.round(v)))}
                suffix="명"
                step={1}
              />
              <Field
                label="미성년 상속인"
                value={minorHeirsCount}
                onChange={(v) => setMinorHeirsCount(Math.max(0, Math.round(v)))}
                suffix="명"
                step={1}
              />
              <Field
                label="미성년 평균 잔여연수"
                value={minorRemainingYears}
                onChange={(v) => setMinorRemainingYears(Math.max(0, Math.round(v)))}
                suffix="년"
                step={1}
                hint="19세까지 남은 연수"
              />
              <Field
                label="장애인 상속인"
                value={disabledHeirsCount}
                onChange={(v) => setDisabledHeirsCount(Math.max(0, Math.round(v)))}
                suffix="명"
                step={1}
              />
              <Field
                label="장애인 평균 기대여명"
                value={disabledRemainingYears}
                onChange={(v) => setDisabledRemainingYears(Math.max(0, Math.round(v)))}
                suffix="년"
                step={1}
              />
            </div>
            <Field
              label="순금융재산가액"
              value={netFinancialAssets}
              onChange={setNetFinancialAssets}
              step={1_000_000}
              hint="예금·주식 등 금융재산 - 금융채무. 금융재산공제 계산에 사용"
            />
          </div>
        </section>

        <section className="space-y-4">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
            <p className="text-sm text-slate-500">예상 납부세액</p>
            <p className="text-3xl font-extrabold tabular-nums text-emerald-700">{fmt(r.finalTax)}원</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-2 text-base font-semibold">상세 내역</h2>
            <div className="divide-y divide-slate-100">
              <Row label="과세가액" value={`${fmt(r.taxableValue)}원`} />
              <Row label="공제 합계" value={`${fmt(r.totalDeduction)}원`} />
              <Row label="과세표준" value={`${fmt(r.taxBase)}원`} />
              <Row label="산출세액" value={`${fmt(r.calculatedTax)}원`} strong />
              <Row label="납부세액 (신고세액공제 3% 반영)" value={`${fmt(r.finalTax)}원`} strong />
            </div>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-relaxed text-amber-800">
            <b>이 계산은 예상치입니다.</b> 배우자 법정상속분 정밀 계산, 상속개시 전 10년 이내
            사전증여재산 합산, 재산평가 특례(감정평가 등), 유류분은 반영하지 않았습니다. 정확한
            세액은 세무사 상담 또는 국세청 홈택스에서 확인하세요.
          </div>
        </section>
      </div>
    </div>
  )
}
