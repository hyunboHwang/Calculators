import { useMemo, useState } from 'react'
import { calcPensionTaxCredit } from '../lib/pensionTaxCredit'
import { Field, Row, fmt, fmtPct } from '../components/ui'

export default function PensionTaxCreditCalculator() {
  const [totalSalary, setTotalSalary] = useState(50_000_000)
  const [pensionSavingsContribution, setPensionSavingsContribution] = useState(4_000_000)
  const [irpContribution, setIrpContribution] = useState(2_000_000)

  const r = useMemo(
    () => calcPensionTaxCredit({ totalSalary, pensionSavingsContribution, irpContribution }),
    [totalSalary, pensionSavingsContribution, irpContribution],
  )

  return (
    <div>
      <h1 className="text-2xl font-bold">연금저축·IRP 세액공제 계산기</h1>
      <p className="mt-1 mb-6 text-sm text-slate-500">
        연금저축·IRP 납입액과 총급여로 세액공제 인정액과 예상 환급액을 계산합니다.
      </p>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <section className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-base font-semibold">납입 정보 입력</h2>
          <div className="space-y-4">
            <Field
              label="총급여"
              value={totalSalary}
              onChange={setTotalSalary}
              step={1_000_000}
              hint="근로소득자 기준. 5,500만원 이하면 16.5%, 초과면 13.2% 공제율 적용"
            />
            <Field
              label="연금저축 납입액"
              value={pensionSavingsContribution}
              onChange={setPensionSavingsContribution}
              step={100_000}
              hint="단독 한도 600만원"
            />
            <Field
              label="IRP 납입액"
              value={irpContribution}
              onChange={setIrpContribution}
              step={100_000}
              hint="연금저축과 합산 한도 900만원"
            />
          </div>
        </section>

        <section className="space-y-4">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
            <p className="text-sm text-slate-500">예상 세액공제액</p>
            <p className="text-3xl font-extrabold tabular-nums text-emerald-700">{fmt(r.deductionAmount)}원</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-2 text-base font-semibold">계산 내역</h2>
            <div className="divide-y divide-slate-100">
              <Row label="연금저축 인정액 (600만원 한도)" value={`${fmt(r.pensionSavingsRecognized)}원`} />
              <Row label="합산 인정액 (900만원 한도)" value={`${fmt(r.totalRecognized)}원`} />
              <Row label="적용 공제율" value={fmtPct(r.rate * 100)} />
              <Row label="예상 세액공제액" value={`${fmt(r.deductionAmount)}원`} strong />
            </div>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-relaxed text-amber-800">
            <b>이 계산은 예상치입니다.</b> 종합소득자(사업소득 등)는 총급여가 아닌 종합소득금액
            기준으로 공제율 구간이 달라질 수 있습니다. 50세 이상 추가한도(200만원)는 2022년
            일몰 종료되어 현재 적용되지 않습니다.
          </div>
        </section>
      </div>
    </div>
  )
}
