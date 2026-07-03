import { useMemo, useState } from 'react'
import { prepaymentFee } from '../lib/loan'
import { parseDate, todayStr, ageParts } from '../lib/age'
import { Field, Row, DateField, fmt } from '../components/ui'

export default function PrepaymentCalculator() {
  const [amount, setAmount] = useState(50_000_000)
  const [feeRate, setFeeRate] = useState(0.7)
  const [loanDate, setLoanDate] = useState('2025-01-01')
  const [repayDate, setRepayDate] = useState(todayStr())
  const [feePeriod, setFeePeriod] = useState(36)
  const [loanRate, setLoanRate] = useState(4.0)
  const [remainMonths, setRemainMonths] = useState(24)

  const r = useMemo(() => {
    const start = parseDate(loanDate)
    const end = parseDate(repayDate)
    if (!start || !end || start.getTime() > end.getTime()) return null

    const p = ageParts(start, end)
    const elapsedMonths = p.years * 12 + p.months + p.days / 30.44

    const fee = prepaymentFee(amount, feeRate, elapsedMonths, feePeriod)
    const exempt = elapsedMonths >= feePeriod
    const monthsToExempt = Math.max(feePeriod - elapsedMonths, 0)

    // 이자 절감 (만기일시 기준 근사, 원리금균등이면 이보다 적음)
    const monthlySaving = (amount * (loanRate / 100)) / 12
    const totalSaving = monthlySaving * remainMonths
    const paybackMonths = monthlySaving > 0 ? fee / monthlySaving : Infinity
    const worthIt = totalSaving > fee

    return {
      fee,
      exempt,
      elapsedMonths,
      monthsToExempt,
      monthlySaving,
      totalSaving,
      paybackMonths,
      worthIt,
      net: totalSaving - fee,
    }
  }, [amount, feeRate, loanDate, repayDate, feePeriod, loanRate, remainMonths])

  return (
    <div>
      <h1 className="text-2xl font-bold">중도상환수수료 계산기</h1>
      <p className="mt-1 mb-6 text-sm text-slate-500">
        잔여기간 슬라이딩 방식으로 수수료를 계산하고, 지금 갚는 게 이득인지 판단합니다.
      </p>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <section className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-base font-semibold">상환 정보</h2>
          <div className="grid grid-cols-2 gap-x-3 gap-y-4">
            <div className="col-span-2">
              <Field label="중도상환 금액" value={amount} onChange={setAmount} step={1_000_000} />
            </div>
            <Field
              label="수수료율"
              value={feeRate}
              onChange={setFeeRate}
              suffix="%"
              step={0.1}
              hint="약정서 기준"
            />
            <Field
              label="수수료 부과기간"
              value={feePeriod}
              onChange={setFeePeriod}
              suffix="개월"
              step={6}
              hint="보통 36개월"
            />
            <DateField label="대출 실행일" value={loanDate} onChange={setLoanDate} />
            <DateField label="상환 예정일" value={repayDate} onChange={setRepayDate} />
            <Field label="대출 금리" value={loanRate} onChange={setLoanRate} suffix="%" step={0.1} />
            <Field
              label="잔여 대출기간"
              value={remainMonths}
              onChange={setRemainMonths}
              suffix="개월"
              step={6}
              hint="손익 판단용"
            />
          </div>
        </section>

        <section className="space-y-4">
          {!r ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
              날짜를 확인해주세요.
            </div>
          ) : (
            <>
              <div
                className={`rounded-2xl border p-5 ${
                  r.exempt ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-white shadow-sm'
                }`}
              >
                <p className="text-sm text-slate-500">중도상환수수료</p>
                <p className="mt-1 text-3xl font-extrabold tabular-nums text-slate-900">
                  {r.exempt ? '면제 (0원)' : `${fmt(r.fee)}원`}
                </p>
                <p className="mt-2 text-sm text-slate-600">
                  {r.exempt ? (
                    <>부과기간 {feePeriod}개월이 지나 수수료가 면제됩니다.</>
                  ) : (
                    <>
                      경과 {Math.floor(r.elapsedMonths)}개월 / 부과기간 {feePeriod}개월 — 약{' '}
                      <b>{Math.ceil(r.monthsToExempt)}개월</b> 더 지나면 면제됩니다.
                    </>
                  )}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="mb-2 text-base font-semibold">지금 갚는 게 이득일까?</h2>
                <div className="divide-y divide-slate-100">
                  <Row
                    label="월 이자 절감액"
                    value={`${fmt(r.monthlySaving)}원`}
                    sub={`${fmt(amount)}원 × ${loanRate}% ÷ 12`}
                  />
                  <Row
                    label={`잔여 ${remainMonths}개월 총 절감 이자`}
                    value={`${fmt(r.totalSaving)}원`}
                  />
                  <Row label="중도상환수수료" value={`-${fmt(r.fee)}원`} />
                  <Row
                    label="순이익"
                    value={`${r.net >= 0 ? '+' : ''}${fmt(r.net)}원`}
                    strong
                    negative={r.net < 0}
                  />
                </div>
                <p
                  className={`mt-3 rounded-lg p-3 text-sm leading-relaxed ${
                    r.worthIt ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-700'
                  }`}
                >
                  {r.exempt ? (
                    <>수수료가 없으므로 여유 자금이 있다면 상환하는 것이 무조건 유리합니다.</>
                  ) : r.worthIt ? (
                    <>
                      수수료는 약 <b>{r.paybackMonths.toFixed(1)}개월치</b> 이자 절감으로
                      회수됩니다. 그 이후부터는 전부 이득입니다.
                    </>
                  ) : (
                    <>
                      잔여기간이 짧아 절감 이자보다 수수료가 큽니다. 면제 시점(
                      {Math.ceil(r.monthsToExempt)}개월 후)까지 기다리는 것을 검토하세요.
                    </>
                  )}
                </p>
              </div>

              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-relaxed text-amber-800">
                이자 절감액은 잔액 고정(만기일시) 기준 근사치로, 원리금균등 상환이면 실제
                절감액은 이보다 적습니다. 수수료율과 부과기간은 대출 약정서를 확인하세요.
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  )
}
