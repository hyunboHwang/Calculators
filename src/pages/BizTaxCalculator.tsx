import { useMemo, useState } from 'react'
import { calcVat, calcBizIncomeTax, VAT_2026 } from '../lib/bizTax'
import { Field, Row, fmt, fmtPct } from '../components/ui'

export default function BizTaxCalculator() {
  const [annualSales, setAnnualSales] = useState(60_000_000)
  const [annualPurchases, setAnnualPurchases] = useState(36_000_000)
  const [applyCardCredit, setApplyCardCredit] = useState(true)
  const [expenseRate, setExpenseRate] = useState(86)
  const [dependents, setDependents] = useState(1)

  const vat = useMemo(
    () => calcVat({ annualSales, annualPurchases, applyCardCredit }),
    [annualSales, annualPurchases, applyCardCredit],
  )
  const it = useMemo(
    () => calcBizIncomeTax({ annualSales, expenseRate, dependents }),
    [annualSales, expenseRate, dependents],
  )

  return (
    <div>
      <h1 className="text-2xl font-bold">셀러 세금 계산기</h1>
      <p className="mt-1 mb-6 text-sm text-slate-500">
        스마트스토어 셀러 기준 부가가치세(간이 vs 일반)와 종합소득세를 추정합니다.
      </p>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        {/* 입력 */}
        <section className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-base font-semibold">사업 정보</h2>
          <div className="space-y-4">
            <Field
              label="연 매출액"
              value={annualSales}
              onChange={setAnnualSales}
              step={1_000_000}
              hint="공급가액 기준"
            />
            <Field
              label="연 매입액"
              value={annualPurchases}
              onChange={setAnnualPurchases}
              step={1_000_000}
              hint="세금계산서·카드 수취분"
            />
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={applyCardCredit}
                onChange={(e) => setApplyCardCredit(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 accent-emerald-600"
              />
              신용카드 등 발행 세액공제 반영
              <span className="text-xs text-slate-400">(1.3%, 한도 1천만)</span>
            </label>
            <div className="grid grid-cols-2 gap-x-3">
              <Field
                label="경비율"
                value={expenseRate}
                onChange={setExpenseRate}
                suffix="%"
                step={1}
                hint="통신판매 단순경비율 ≈86%"
              />
              <Field
                label="부양가족 수"
                value={dependents}
                onChange={(v) => setDependents(Math.max(1, Math.round(v)))}
                suffix="명"
                step={1}
                hint="본인 포함"
              />
            </div>
          </div>
        </section>

        {/* 결과 */}
        <section className="space-y-4">
          {/* 부가세 비교 */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-base font-semibold">부가가치세 — 간이 vs 일반</h2>
            <div className="grid grid-cols-2 gap-3">
              <div
                className={`rounded-xl border p-4 ${
                  vat.simplifiedEligible
                    ? 'border-emerald-200 bg-emerald-50'
                    : 'border-slate-200 bg-slate-50 opacity-60'
                }`}
              >
                <p className="text-xs font-semibold text-slate-500">간이과세 (연간)</p>
                <p className="mt-1 text-xl font-extrabold tabular-nums">
                  {fmt(vat.simplified)}원
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {!vat.simplifiedEligible
                    ? `매출 ${fmt(VAT_2026.simplifiedThreshold)}원 이상 → 간이 불가`
                    : vat.simplifiedExempt
                      ? '공급대가 4,800만 미만 → 납부의무 면제'
                      : '부가가치율 15% 적용'}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-semibold text-slate-500">일반과세 (연간)</p>
                <p className="mt-1 text-xl font-extrabold tabular-nums">
                  {vat.generalIsRefund
                    ? `환급 ${fmt(Math.abs(vat.general))}원`
                    : `${fmt(vat.general)}원`}
                </p>
                <p className="mt-1 text-xs text-slate-500">매출세액 − 매입세액</p>
              </div>
            </div>
            {vat.simplifiedEligible && !vat.generalIsRefund && (
              <p className="mt-3 text-sm text-slate-600">
                간이과세 선택 시 연{' '}
                <b className={vat.savings >= 0 ? 'text-emerald-700' : 'text-red-600'}>
                  {fmt(Math.abs(vat.savings))}원 {vat.savings >= 0 ? '절세' : '손해'}
                </b>
                {vat.savings < 0 && ' — 매입 비중이 커서 일반과세가 유리합니다'}.
              </p>
            )}
            {vat.generalIsRefund && (
              <p className="mt-3 text-sm text-slate-600">
                매입세액이 더 커서 일반과세라면 <b>환급</b> 대상입니다. 간이과세는 환급이
                없으므로 이 경우 일반과세가 유리합니다.
              </p>
            )}
          </div>

          {/* 종소세 */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-2 text-base font-semibold">종합소득세 추정 (연간)</h2>
            <div className="divide-y divide-slate-100">
              <Row
                label="사업소득금액"
                value={`${fmt(it.income)}원`}
                sub={`매출 × (1 − ${expenseRate}%)`}
              />
              <Row label="과세표준" value={`${fmt(it.taxBase)}원`} sub="기본공제 차감 후" />
              <Row label="종합소득세" value={`${fmt(it.incomeTax)}원`} />
              <Row label="지방소득세" value={`${fmt(it.localTax)}원`} sub="소득세의 10%" />
              <Row label="합계" value={`${fmt(it.total)}원`} strong />
              <Row label="매출 대비 실효세율" value={fmtPct(it.effectiveRate)} />
            </div>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-relaxed text-amber-800">
            <b>추정치입니다.</b> 간이과세 여부는 직전년도 공급대가 기준이며 업종·지역 제한이
            있습니다. 종합소득세는 다른 소득이 없고 기본공제만 있다고 가정했으며, 실제로는
            기장 방식(단순/기준경비율·복식부기), 노란우산공제, 각종 세액공제에 따라 크게
            달라집니다. 근로소득과 겸업이면 합산과세로 세율 구간이 올라갈 수 있습니다.
          </div>
        </section>
      </div>
    </div>
  )
}
