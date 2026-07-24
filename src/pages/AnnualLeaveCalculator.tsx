import { useMemo, useState } from 'react'
import { calcAnnualLeave } from '../lib/annualLeave'
import { Field, Row, DateField, fmt } from '../components/ui'

export default function AnnualLeaveCalculator() {
  const [joinDate, setJoinDate] = useState('2023-01-02')
  const [referenceDate, setReferenceDate] = useState('2026-07-24')
  const [usedDays, setUsedDays] = useState(5)
  const [ordinaryWageMonthly, setOrdinaryWageMonthly] = useState(3_000_000)

  const r = useMemo(
    () => calcAnnualLeave({ joinDate, referenceDate, usedDays, ordinaryWageMonthly }),
    [joinDate, referenceDate, usedDays, ordinaryWageMonthly],
  )

  return (
    <div>
      <h1 className="text-2xl font-bold">연차수당 계산기</h1>
      <p className="mt-1 mb-6 text-sm text-slate-500">
        입사일 기준 발생 연차와 미사용 연차수당을 계산합니다.
      </p>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <section className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-base font-semibold">근무 정보</h2>
          <div className="grid grid-cols-2 gap-x-3 gap-y-4">
            <DateField label="입사일" value={joinDate} onChange={setJoinDate} />
            <DateField label="정산 기준일" value={referenceDate} onChange={setReferenceDate} hint="퇴사일 등" />
            <Field
              label="이미 사용한 연차"
              value={usedDays}
              onChange={(v) => setUsedDays(Math.max(0, Math.round(v)))}
              suffix="일"
              step={1}
            />
            <Field
              label="월 통상임금"
              value={ordinaryWageMonthly}
              onChange={setOrdinaryWageMonthly}
              step={100_000}
              hint="기본급+통상수당"
            />
          </div>
        </section>

        <section className="space-y-4">
          {!r.valid ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
              날짜를 확인해주세요. 정산 기준일이 입사일보다 빠릅니다.
            </div>
          ) : (
            <>
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
                <p className="text-sm text-slate-500">예상 연차수당</p>
                <p className="mt-1 text-3xl font-extrabold tabular-nums text-emerald-700">
                  {fmt(r.amount)}원
                </p>
                <p className="mt-3 text-sm text-slate-600">
                  미사용 연차 <b>{r.unusedDays}일</b> × 1일 통상임금 <b>{fmt(r.dailyWage)}원</b>
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="mb-2 text-base font-semibold">계산 내역</h2>
                <div className="divide-y divide-slate-100">
                  <Row label="근속기간" value={r.serviceText} />
                  <Row label="발생 연차" value={`${r.accruedDays}일`} />
                  <Row label="사용 연차" value={`${usedDays}일`} />
                  <Row label="미사용 연차" value={`${r.unusedDays}일`} strong />
                  <Row label="통상시급" value={`${fmt(r.hourlyWage)}원`} sub="월 통상임금 ÷ 209시간" />
                  <Row label="1일 통상임금" value={`${fmt(r.dailyWage)}원`} />
                  <Row label="연차수당" value={`${fmt(r.amount)}원`} strong />
                </div>
              </div>
            </>
          )}

          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-relaxed text-amber-800">
            계속근로 1년 미만은 1개월 개근 시 1일(최대 11일), 1년 이상은 15일에 최초 1년 이후
            매 2년마다 1일씩 가산되어 최대 25일까지 발생합니다(근로기준법 60조). 이 계산은 매월
            개근을 가정한 최대치이며, 무급휴직·결근이 있으면 실제 발생일수가 줄어들 수 있습니다.
            통상임금 산정 기준(월 209시간)은 주 40시간 근무를 가정한 값입니다.
          </div>
        </section>
      </div>
    </div>
  )
}
