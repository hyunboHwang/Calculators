import { useMemo, useState } from 'react'
import { calcSeverance } from '../lib/severance'
import { Field, Row, DateField, fmt } from '../components/ui'

export default function SeveranceCalculator() {
  const [joinDate, setJoinDate] = useState('2023-01-02')
  const [leaveDate, setLeaveDate] = useState('2026-07-03')
  const [monthlySalary, setMonthlySalary] = useState(3_000_000)
  const [annualBonus, setAnnualBonus] = useState(0)
  const [annualLeavePay, setAnnualLeavePay] = useState(0)

  const r = useMemo(
    () => calcSeverance({ joinDate, leaveDate, monthlySalary, annualBonus, annualLeavePay }),
    [joinDate, leaveDate, monthlySalary, annualBonus, annualLeavePay],
  )

  return (
    <div>
      <h1 className="text-2xl font-bold">퇴직금 계산기</h1>
      <p className="mt-1 mb-6 text-sm text-slate-500">
        고용노동부 평균임금 방식: 1일 평균임금 × 30일 × (재직일수 ÷ 365)
      </p>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <section className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-base font-semibold">근무 정보</h2>
          <div className="grid grid-cols-2 gap-x-3 gap-y-4">
            <DateField label="입사일" value={joinDate} onChange={setJoinDate} />
            <DateField label="퇴사일 (마지막 근무일)" value={leaveDate} onChange={setLeaveDate} />
            <div className="col-span-2">
              <Field
                label="월 급여 (기본급 + 수당)"
                value={monthlySalary}
                onChange={setMonthlySalary}
                step={100_000}
                hint="퇴직 전 3개월 평균"
              />
            </div>
            <Field
              label="연간 상여금 총액"
              value={annualBonus}
              onChange={setAnnualBonus}
              step={100_000}
            />
            <Field
              label="연차수당 (연간)"
              value={annualLeavePay}
              onChange={setAnnualLeavePay}
              step={100_000}
              hint="퇴직 전 1년간"
            />
          </div>
        </section>

        <section className="space-y-4">
          {!r.valid ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
              날짜를 확인해주세요. 퇴사일이 입사일보다 빠릅니다.
            </div>
          ) : !r.eligible ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
              <p className="font-semibold text-red-700">퇴직금 지급 대상이 아닙니다</p>
              <p className="mt-2 text-sm text-red-600">
                재직기간 {r.serviceText} — 퇴직금은 계속근로기간 1년 이상부터 발생합니다.
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
              <p className="text-sm text-slate-500">예상 퇴직금 (세전)</p>
              <p className="mt-1 text-3xl font-extrabold tabular-nums text-emerald-700">
                {fmt(r.amount)}원
              </p>
              <p className="mt-3 text-sm text-slate-600">
                재직기간 <b>{r.serviceText}</b>, 1일 평균임금 <b>{fmt(r.avgDailyWage)}원</b>{' '}
                기준입니다.
              </p>
            </div>
          )}

          {r.valid && r.eligible && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="mb-2 text-base font-semibold">계산 내역</h2>
              <div className="divide-y divide-slate-100">
                <Row
                  label="3개월 임금 총액"
                  value={`${fmt(monthlySalary * 3 + (annualBonus * 3) / 12 + (annualLeavePay * 3) / 12)}원`}
                  sub="급여×3 + 상여×3/12 + 연차수당×3/12"
                />
                <Row label="1일 평균임금" value={`${fmt(r.avgDailyWage)}원`} />
                <Row label="재직일수" value={`${fmt(r.serviceDays)}일`} />
                <Row label="예상 퇴직금" value={`${fmt(r.amount)}원`} strong />
              </div>
            </div>
          )}

          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-relaxed text-amber-800">
            세전 금액이며 퇴직소득세는 반영하지 않았습니다. 3개월간 급여 변동, 무급휴직,
            평균임금에 포함되는 수당 범위에 따라 실제 금액과 달라질 수 있습니다. 통상임금이
            평균임금보다 크면 통상임금으로 계산해야 합니다.
          </div>
        </section>
      </div>
    </div>
  )
}
