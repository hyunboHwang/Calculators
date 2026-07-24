import { useMemo, useState } from 'react'
import { calcWithholding, calcFreelanceAnnualTax, type WithholdingInput } from '../lib/freelanceTax'
import { Field, Row, fmt } from '../components/ui'

export default function FreelanceTaxCalculator() {
  const [mode, setMode] = useState<WithholdingInput['mode']>('grossToNet')
  const [amount, setAmount] = useState(1_000_000)

  const w = useMemo(() => calcWithholding({ mode, amount }), [mode, amount])

  const [annualIncome, setAnnualIncome] = useState(30_000_000)
  const [expenseRate, setExpenseRate] = useState(60)
  const [dependents, setDependents] = useState(1)

  const a = useMemo(
    () => calcFreelanceAnnualTax({ annualIncome, expenseRate, dependents }),
    [annualIncome, expenseRate, dependents],
  )

  return (
    <div>
      <h1 className="text-2xl font-bold">프리랜서 3.3% 계산기</h1>
      <p className="mt-1 mb-6 text-sm text-slate-500">
        사업소득 원천징수(3.3%) 세전·세후 환산과 연간 종합소득세 정산 추정입니다.
      </p>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <section className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-base font-semibold">건별 원천징수 계산</h2>
            <div className="mb-4 flex gap-1.5">
              {(['grossToNet', 'netToGross'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={`flex-1 rounded-lg border px-2 py-2 text-xs font-medium transition-colors ${
                    mode === m
                      ? 'border-emerald-600 bg-emerald-600 text-white'
                      : 'border-slate-300 text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  {m === 'grossToNet' ? '세전 → 세후' : '세후 → 세전'}
                </button>
              ))}
            </div>
            <Field
              label={mode === 'grossToNet' ? '세전 용역비' : '받고 싶은 세후 금액'}
              value={amount}
              onChange={setAmount}
              step={100_000}
            />
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-base font-semibold">연간 종합소득세 추정</h2>
            <Field
              label="연간 총 용역비 (세전 합계)"
              value={annualIncome}
              onChange={setAnnualIncome}
              step={1_000_000}
            />
            <div className="mt-4 grid grid-cols-2 gap-x-3 gap-y-4">
              <Field
                label="경비율"
                value={expenseRate}
                onChange={setExpenseRate}
                suffix="%"
                step={1}
                hint="단순경비율, 업종별 상이"
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

        <section className="space-y-4">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-sm text-slate-500">세전 금액</p>
                <p className="text-2xl font-extrabold tabular-nums text-slate-800">{fmt(w.gross)}원</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-slate-500">세후 실수령액</p>
                <p className="text-2xl font-extrabold tabular-nums text-emerald-700">{fmt(w.net)}원</p>
              </div>
            </div>
            <p className="mt-3 text-sm text-slate-600">
              원천징수액 <b>{fmt(w.withholding)}원</b> (소득세 3% + 지방소득세 0.3%)
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-2 text-base font-semibold">연간 정산 추정</h2>
            <div className="divide-y divide-slate-100">
              <Row label="소득금액" value={`${fmt(a.income)}원`} sub={`매출×(1-경비율)`} />
              <Row label="과세표준" value={`${fmt(a.taxBase)}원`} />
              <Row label="종합소득세+지방소득세" value={`${fmt(a.total)}원`} strong />
              <Row label="기납부세액 (3.3% 누계)" value={`${fmt(a.alreadyWithheld)}원`} />
              <Row
                label={a.isRefund ? '예상 환급액' : '예상 추가납부액'}
                value={`${fmt(Math.abs(a.settlement))}원`}
                strong
                negative={!a.isRefund}
              />
            </div>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-relaxed text-amber-800">
            <b>이 계산은 예상치입니다.</b> 3.3%는 매월 떼는 예납일 뿐이고, 실제 세금은 다음 해
            5월 종합소득세 신고에서 경비율·소득공제를 반영해 정산됩니다. 경비율은 업종별로
            크게 다르므로(예: 인적용역 단순경비율 대략 50~65%대) 국세청 홈택스에서 본인 업종의
            경비율을 확인해 입력하세요. 다른 소득(근로소득 등)이 있으면 합산 과세되어 세율
            구간이 달라질 수 있습니다.
          </div>
        </section>
      </div>
    </div>
  )
}
