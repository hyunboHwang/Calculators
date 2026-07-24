import { useMemo, useState } from 'react'
import { calcYearEndTax, type YearEndTaxInput } from '../lib/yearEndTax'
import { Field, Row, fmt } from '../components/ui'

export default function YearEndTaxCalculator() {
  const [input, setInput] = useState<YearEndTaxInput>({
    annualSalary: 40_000_000,
    nonTaxableMonthly: 200_000,
    dependents: 1,
    children: 0,
    withholdingRatio: 100,
    creditCard: 8_000_000,
    debitCashReceipt: 4_000_000,
    pensionSavings: 0,
    irp: 0,
    insurancePremium: 0,
    medicalExpense: 0,
    educationExpense: 0,
    donation: 0,
    monthlyRent: 0,
  })

  const set = <K extends keyof YearEndTaxInput>(k: K) => (v: YearEndTaxInput[K]) =>
    setInput((prev) => ({ ...prev, [k]: v }))

  const r = useMemo(() => calcYearEndTax(input), [input])

  return (
    <div>
      <h1 className="text-2xl font-bold">연말정산 환급액 계산기</h1>
      <p className="mt-1 mb-6 text-sm text-slate-500">
        신용카드·연금계좌·보험료·의료비·교육비·기부금·월세 공제를 반영한 결정세액과
        환급/추가납부 예상액입니다.
      </p>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        {/* 입력 */}
        <section className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-base font-semibold">기본 정보</h2>
            <Field
              label="연봉 (세전)"
              value={input.annualSalary}
              onChange={set('annualSalary')}
              step={1_000_000}
            />
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
                <div className="flex gap-1.5">
                  {([80, 100, 120] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => set('withholdingRatio')(p)}
                      className={`min-w-0 flex-1 rounded-lg border px-1 py-2 text-sm font-medium transition-colors ${
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
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-base font-semibold">소득공제 항목 (연간)</h2>
            <div className="grid grid-cols-2 gap-x-3 gap-y-4">
              <Field
                label="신용카드 사용액"
                value={input.creditCard}
                onChange={set('creditCard')}
                step={500_000}
              />
              <Field
                label="체크카드·현금영수증"
                value={input.debitCashReceipt}
                onChange={set('debitCashReceipt')}
                step={500_000}
              />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-base font-semibold">세액공제 항목 (연간)</h2>
            <div className="grid grid-cols-2 gap-x-3 gap-y-4">
              <Field
                label="연금저축 납입액"
                value={input.pensionSavings}
                onChange={set('pensionSavings')}
                step={100_000}
                hint="한도 600만"
              />
              <Field label="IRP 납입액" value={input.irp} onChange={set('irp')} step={100_000} hint="합산 한도 900만" />
              <Field
                label="보장성보험료"
                value={input.insurancePremium}
                onChange={set('insurancePremium')}
                step={100_000}
                hint="한도 100만"
              />
              <Field
                label="의료비 지출액"
                value={input.medicalExpense}
                onChange={set('medicalExpense')}
                step={100_000}
                hint="총급여 3% 초과분만"
              />
              <Field
                label="교육비 지출액"
                value={input.educationExpense}
                onChange={set('educationExpense')}
                step={100_000}
              />
              <Field label="기부금" value={input.donation} onChange={set('donation')} step={100_000} />
              <div className="col-span-2">
                <Field
                  label="월세액"
                  value={input.monthlyRent}
                  onChange={set('monthlyRent')}
                  step={50_000}
                  hint="무주택 세대주, 총급여 8천만원 이하만 해당"
                />
              </div>
            </div>
          </div>
        </section>

        {/* 결과 */}
        <section className="space-y-4">
          <div
            className={`rounded-2xl border p-5 ${
              r.isRefund ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50'
            }`}
          >
            <p className="text-sm text-slate-500">{r.isRefund ? '예상 환급액' : '예상 추가납부액'}</p>
            <p
              className={`mt-1 text-3xl font-extrabold tabular-nums ${
                r.isRefund ? 'text-emerald-700' : 'text-red-700'
              }`}
            >
              {fmt(Math.abs(r.refund))}원
            </p>
            <p className="mt-3 text-sm text-slate-600">
              기납부세액 <b>{fmt(r.paidTax + r.paidLocalTax)}원</b> − 결정세액{' '}
              <b>{fmt(r.finalTax + r.finalLocalTax)}원</b>
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-2 text-base font-semibold">소득공제 · 과세표준</h2>
            <div className="divide-y divide-slate-100">
              <Row label="총급여 (비과세 제외)" value={`${fmt(r.gross)}원`} />
              <Row label="근로소득금액" value={`${fmt(r.earnedIncome)}원`} sub="근로소득공제 차감 후" />
              <Row label="인적공제" value={`-${fmt(r.personalDeduction)}원`} />
              <Row label="국민연금보험료공제" value={`-${fmt(r.pensionInsuranceDeduction)}원`} />
              <Row label="건강·고용보험료공제" value={`-${fmt(r.healthInsuranceDeduction)}원`} />
              <Row label="신용카드 등 소득공제" value={`-${fmt(r.cardDeduction)}원`} />
              <Row label="과세표준" value={`${fmt(r.taxBase)}원`} strong />
              <Row label="산출세액" value={`${fmt(r.calculatedTax)}원`} strong />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-2 text-base font-semibold">세액공제 내역</h2>
            <div className="divide-y divide-slate-100">
              <Row label="근로소득세액공제" value={`-${fmt(r.earnedCredit)}원`} />
              <Row label="자녀세액공제" value={`-${fmt(r.childCredit)}원`} />
              <Row label="연금계좌세액공제" value={`-${fmt(r.pensionCredit)}원`} />
              <Row label="보험료세액공제" value={`-${fmt(r.insuranceCredit)}원`} />
              <Row label="의료비세액공제" value={`-${fmt(r.medicalCredit)}원`} />
              <Row label="교육비세액공제" value={`-${fmt(r.educationCredit)}원`} />
              <Row label="기부금세액공제" value={`-${fmt(r.donationCredit)}원`} />
              <Row label="월세액세액공제" value={`-${fmt(r.rentCredit)}원`} />
              <Row label="세액공제 합계" value={`-${fmt(r.totalCredit)}원`} strong />
              <Row label="결정세액 (지방소득세 포함)" value={`${fmt(r.finalTax + r.finalLocalTax)}원`} strong />
            </div>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-relaxed text-amber-800">
            <b>이 계산은 근사 추정치입니다.</b> 주택자금(주담대 이자상환액) 소득공제, 청약저축
            공제, 장애인·경로우대 추가공제, 부양가족의 소득 요건 등은 반영하지 않았습니다.
            기납부세액은 원천징수 간이세액표 산출방식으로 추정한 값이라 실제 원천징수영수증
            금액과 다를 수 있습니다. 정확한 환급액은 국세청 홈택스 연말정산 간소화 서비스에서
            확인하세요.
          </div>
        </section>
      </div>
    </div>
  )
}
