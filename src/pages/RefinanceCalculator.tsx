import { useMemo, useState } from 'react'
import { amortize, prepaymentFee } from '../lib/loan'
import { Field, Row, fmt } from '../components/ui'

export default function RefinanceCalculator() {
  const [balance, setBalance] = useState(200_000_000)
  const [oldRate, setOldRate] = useState(4.8)
  const [newRate, setNewRate] = useState(3.9)
  const [remainMonths, setRemainMonths] = useState(240)
  const [feeRate, setFeeRate] = useState(0.7)
  const [elapsedMonths, setElapsedMonths] = useState(12)
  const [feePeriod, setFeePeriod] = useState(36)
  const [etcCost, setEtcCost] = useState(0)

  const r = useMemo(() => {
    const oldLoan = amortize(balance, oldRate, remainMonths, 'equalPayment')
    const newLoan = amortize(balance, newRate, remainMonths, 'equalPayment')
    const fee = prepaymentFee(balance, feeRate, elapsedMonths, feePeriod)
    const cost = fee + etcCost

    const monthlySaving = oldLoan.firstPayment - newLoan.firstPayment
    const interestSaving = oldLoan.totalInterest - newLoan.totalInterest
    const net = interestSaving - cost
    const breakEvenMonths = monthlySaving > 0 ? cost / monthlySaving : Infinity

    return { oldLoan, newLoan, fee, cost, monthlySaving, interestSaving, net, breakEvenMonths }
  }, [balance, oldRate, newRate, remainMonths, feeRate, elapsedMonths, feePeriod, etcCost])

  const good = r.net > 0 && r.monthlySaving > 0

  return (
    <div>
      <h1 className="text-2xl font-bold">대출 갈아타기 계산기</h1>
      <p className="mt-1 mb-6 text-sm text-slate-500">
        기존 대출을 낮은 금리로 대환할 때 중도상환수수료를 포함한 손익과 손익분기 시점을
        계산합니다.
      </p>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <section className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-base font-semibold">대출 조건</h2>
          <div className="grid grid-cols-2 gap-x-3 gap-y-4">
            <div className="col-span-2">
              <Field label="대출 잔액" value={balance} onChange={setBalance} step={10_000_000} />
            </div>
            <Field label="기존 금리" value={oldRate} onChange={setOldRate} suffix="%" step={0.1} />
            <Field label="새 금리" value={newRate} onChange={setNewRate} suffix="%" step={0.1} />
            <Field
              label="잔여 기간"
              value={remainMonths}
              onChange={setRemainMonths}
              suffix="개월"
              step={12}
            />
            <Field
              label="기타 비용"
              value={etcCost}
              onChange={setEtcCost}
              step={50_000}
              hint="인지세 등"
            />
            <Field
              label="중도상환수수료율"
              value={feeRate}
              onChange={setFeeRate}
              suffix="%"
              step={0.1}
            />
            <Field
              label="기존 대출 경과"
              value={elapsedMonths}
              onChange={setElapsedMonths}
              suffix="개월"
              step={1}
            />
            <Field
              label="수수료 부과기간"
              value={feePeriod}
              onChange={setFeePeriod}
              suffix="개월"
              step={6}
              hint="보통 36개월"
            />
          </div>
          <p className="mt-3 text-xs text-slate-400">
            두 대출 모두 원리금균등, 같은 잔여기간으로 가정합니다.
          </p>
        </section>

        <section className="space-y-4">
          <div
            className={`rounded-2xl border p-5 ${
              good ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50'
            }`}
          >
            <div className="flex flex-wrap items-center gap-3">
              <span
                className={`shrink-0 rounded-full px-3 py-1 text-sm font-bold whitespace-nowrap text-white ${
                  good ? 'bg-emerald-600' : 'bg-red-600'
                }`}
              >
                {good ? '갈아타는 게 이득' : '갈아타면 손해'}
              </span>
              <span className="text-2xl font-extrabold tabular-nums">
                {r.net >= 0 ? '+' : ''}
                {fmt(r.net)}원
              </span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              {good ? (
                <>
                  월 상환액이 <b>{fmt(r.monthlySaving)}원</b> 줄고, 비용을 빼고도 잔여기간
                  동안 총 <b>{fmt(r.net)}원</b> 아낍니다. 대환 비용은 약{' '}
                  <b>{Math.ceil(r.breakEvenMonths)}개월</b>이면 회수됩니다.
                </>
              ) : (
                <>
                  금리 차이로 아끼는 이자({fmt(r.interestSaving)}원)보다 대환 비용(
                  {fmt(r.cost)}원)이 큽니다. 수수료 면제 시점 이후 대환을 검토하세요.
                </>
              )}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-base font-semibold">기존 vs 신규</h2>
            <div className="grid grid-cols-3 gap-2 border-b border-slate-100 pb-2 text-xs font-semibold text-slate-400">
              <span />
              <span className="text-right">기존 {oldRate}%</span>
              <span className="text-right">신규 {newRate}%</span>
            </div>
            {(
              [
                ['월 상환액', r.oldLoan.firstPayment, r.newLoan.firstPayment],
                ['잔여기간 총 이자', r.oldLoan.totalInterest, r.newLoan.totalInterest],
                ['총 상환액', r.oldLoan.totalPayment, r.newLoan.totalPayment],
              ] as [string, number, number][]
            ).map(([label, a, b], i) => (
              <div
                key={label}
                className={`grid grid-cols-3 gap-2 py-2 text-sm text-slate-600 ${
                  i > 0 ? 'border-t border-slate-100' : ''
                }`}
              >
                <span>{label}</span>
                <span className="text-right tabular-nums">{fmt(a)}원</span>
                <span className="text-right font-semibold tabular-nums text-slate-800">
                  {fmt(b)}원
                </span>
              </div>
            ))}
            <div className="mt-2 rounded-lg bg-slate-50 p-3">
              <Row label="이자 절감액" value={`+${fmt(r.interestSaving)}원`} />
              <Row
                label="중도상환수수료"
                value={`-${fmt(r.fee)}원`}
                sub={r.fee === 0 ? '부과기간 경과로 면제' : undefined}
              />
              {etcCost > 0 && <Row label="기타 비용" value={`-${fmt(etcCost)}원`} />}
              <Row
                label="순이익"
                value={`${r.net >= 0 ? '+' : ''}${fmt(r.net)}원`}
                strong
                negative={r.net < 0}
              />
            </div>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-relaxed text-amber-800">
            새 대출의 기간을 다시 길게 잡으면 월 상환액은 더 줄지만 총이자는 늘어날 수
            있습니다. 신규 대출의 인지세·근저당 설정비 부담 조건과 DSR 재심사 여부도 함께
            확인하세요.
          </div>
        </section>
      </div>
    </div>
  )
}
