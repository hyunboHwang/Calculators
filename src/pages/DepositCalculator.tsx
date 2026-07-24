import { useMemo, useState } from 'react'
import { calcDeposit, type DepositInput, type TaxOption } from '../lib/deposit'
import { Field, Row, fmt } from '../components/ui'

const TAX_LABELS: Record<TaxOption, string> = {
  general: '일반과세 15.4%',
  preferential: '세금우대 9.5%',
  exempt: '비과세',
}

export default function DepositCalculator() {
  const [input, setInput] = useState<DepositInput>({
    mode: 'deposit',
    amount: 10_000_000,
    annualRate: 3.5,
    months: 12,
    compound: false,
    taxOption: 'general',
  })

  const set = <K extends keyof DepositInput>(k: K) => (v: DepositInput[K]) =>
    setInput((prev) => ({ ...prev, [k]: v }))

  const r = useMemo(() => calcDeposit(input), [input])

  return (
    <div>
      <h1 className="text-2xl font-bold">예적금 이자 계산기</h1>
      <p className="mt-1 mb-6 text-sm text-slate-500">
        정기예금·정기적금의 세전·세후 이자와 만기 수령액을 계산합니다.
      </p>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <section className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-base font-semibold">예금 정보 입력</h2>

          <div className="mb-4 flex gap-1.5">
            {(['deposit', 'savings'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => set('mode')(m)}
                className={`flex-1 rounded-lg border px-2 py-2 text-sm font-medium transition-colors ${
                  input.mode === m
                    ? 'border-emerald-600 bg-emerald-600 text-white'
                    : 'border-slate-300 text-slate-500 hover:bg-slate-100'
                }`}
              >
                {m === 'deposit' ? '예금 (거치식)' : '적금 (적립식)'}
              </button>
            ))}
          </div>

          <Field
            label={input.mode === 'deposit' ? '예치금 (원금)' : '월 납입액'}
            value={input.amount}
            onChange={set('amount')}
            step={input.mode === 'deposit' ? 1_000_000 : 100_000}
          />

          <div className="mt-4 grid grid-cols-2 gap-x-3 gap-y-4">
            <Field
              label="연 이율"
              value={input.annualRate}
              onChange={set('annualRate')}
              suffix="%"
              step={0.1}
            />
            <Field label="예치 기간" value={input.months} onChange={set('months')} suffix="개월" step={1} />
          </div>

          {input.mode === 'deposit' && (
            <div className="mt-4">
              <span className="mb-1 block text-sm font-medium text-slate-700">이자 방식</span>
              <div className="flex gap-1.5">
                {([false, true] as const).map((c) => (
                  <button
                    key={String(c)}
                    type="button"
                    onClick={() => set('compound')(c)}
                    className={`flex-1 rounded-lg border px-2 py-2 text-sm font-medium transition-colors ${
                      input.compound === c
                        ? 'border-emerald-600 bg-emerald-600 text-white'
                        : 'border-slate-300 text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    {c ? '월복리' : '단리'}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mt-4">
            <span className="mb-1 block text-sm font-medium text-slate-700">과세 방식</span>
            <div className="flex gap-1.5">
              {(Object.keys(TAX_LABELS) as TaxOption[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => set('taxOption')(t)}
                  className={`flex-1 rounded-lg border px-1 py-2 text-xs font-medium transition-colors ${
                    input.taxOption === t
                      ? 'border-emerald-600 bg-emerald-600 text-white'
                      : 'border-slate-300 text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  {TAX_LABELS[t]}
                </button>
              ))}
            </div>
          </div>

          {input.mode === 'savings' && (
            <p className="mt-4 text-xs leading-relaxed text-slate-400">
              적금은 매월 납입한 금액이 만기까지 남은 기간만큼만 이자가 붙는 단리 후취 방식으로
              계산합니다. 그래서 "연 5% 적금"이라도 실제 받는 이자는 예금보다 훨씬 적습니다.
            </p>
          )}
        </section>

        <section className="space-y-4">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-sm text-slate-500">세후 이자</p>
                <p className="text-3xl font-extrabold tabular-nums text-emerald-700">
                  {fmt(r.postTaxInterest)}원
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-slate-500">만기 수령액</p>
                <p className="text-lg font-bold tabular-nums">{fmt(r.maturityAmount)}원</p>
              </div>
            </div>
            <p className="mt-3 text-sm text-slate-600">
              세후 실질 연이율 <b>{r.effectiveAnnualRate.toFixed(2)}%</b> (원금 대비, 단리 환산)
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-2 text-base font-semibold">계산 내역</h2>
            <div className="divide-y divide-slate-100">
              <Row
                label="원금 합계"
                value={`${fmt(r.principal)}원`}
                sub={input.mode === 'savings' ? `월 ${fmt(input.amount)}원 × ${input.months}개월` : undefined}
              />
              <Row label="세전 이자" value={`${fmt(r.preTaxInterest)}원`} />
              <Row label="이자소득세" value={`-${fmt(r.tax)}원`} sub={TAX_LABELS[input.taxOption]} />
              <Row label="세후 이자" value={`${fmt(r.postTaxInterest)}원`} strong />
              <Row label="만기 수령액" value={`${fmt(r.maturityAmount)}원`} strong />
            </div>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-relaxed text-amber-800">
            은행 광고 금리(세전)와 실제 수령 이자(세후)는 다릅니다. 일반과세 기준 이자소득세
            15.4%가 원천징수되며, 연간 이자·배당 합계가 2,000만원을 넘으면 금융소득종합과세
            대상이 될 수 있습니다. 세금우대(9.5%)는 조합원 예탁금 등 한정된 상품에만 적용됩니다.
          </div>
        </section>
      </div>
    </div>
  )
}
