import { useMemo, useState } from 'react'
import { calcParentalLeave } from '../lib/parentalLeave'
import { Field, Row, fmt } from '../components/ui'

export default function ParentalLeaveCalculator() {
  const [ordinaryWage, setOrdinaryWage] = useState(3_000_000)
  const [leaveMonths, setLeaveMonths] = useState(12)

  const r = useMemo(
    () => calcParentalLeave({ ordinaryWage, leaveMonths }),
    [ordinaryWage, leaveMonths],
  )

  return (
    <div>
      <h1 className="text-2xl font-bold">육아휴직급여 계산기</h1>
      <p className="mt-1 mb-6 text-sm text-slate-500">
        2025년 개편 기준(사후지급금 폐지, 매월 전액 지급) 예상 육아휴직급여입니다.
      </p>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <section className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-base font-semibold">휴직 정보 입력</h2>
          <Field
            label="월 통상임금"
            value={ordinaryWage}
            onChange={setOrdinaryWage}
            step={100_000}
            hint="기본급+통상수당, 월급여로 근사 가능"
          />
          <div className="mt-4">
            <Field
              label="육아휴직 기간"
              value={leaveMonths}
              onChange={(v) => setLeaveMonths(Math.max(0, Math.round(v)))}
              suffix="개월"
              step={1}
            />
          </div>
        </section>

        <section className="space-y-4">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-sm text-slate-500">총 육아휴직급여</p>
                <p className="text-3xl font-extrabold tabular-nums text-emerald-700">
                  {fmt(r.total)}원
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-slate-500">월평균</p>
                <p className="text-lg font-bold tabular-nums">{fmt(r.average)}원</p>
              </div>
            </div>
            {r.isCapped && (
              <p className="mt-3 text-sm text-slate-600">
                통상임금이 상한액을 넘어 1~3개월차는 <b>250만원</b>으로 제한됩니다.
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-2 text-base font-semibold">구간별 지급액</h2>
            <div className="divide-y divide-slate-100">
              <Row
                label="1~3개월차"
                value={`${fmt(r.phase1)}원`}
                sub={`월 상한 250만원 · ${Math.min(leaveMonths, 3)}개월`}
              />
              <Row
                label="4~6개월차"
                value={`${fmt(r.phase2)}원`}
                sub={`월 상한 200만원 · ${Math.max(Math.min(leaveMonths, 6) - 3, 0)}개월`}
              />
              <Row
                label="7개월차~"
                value={`${fmt(r.phase3)}원`}
                sub={`월 상한 160만원 · ${Math.max(leaveMonths - 6, 0)}개월`}
              />
              <Row label="총 지급액" value={`${fmt(r.total)}원`} strong />
            </div>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-relaxed text-amber-800">
            <b>이 계산은 예상치입니다.</b> 하한액은 전 구간 70만원이며, 2025년 개편으로
            사후지급금(과거 25% 유보분) 제도가 폐지되어 매월 전액이 지급됩니다. 부모가 모두
            육아휴직을 사용하는 "6+6 부모육아휴직제" 특례(첫 6개월 상한 인상)는 별도 제도라
            반영하지 않았습니다. 정확한 지급액과 특례 적용 여부는 고용보험 홈페이지에서
            확인하세요.
          </div>
        </section>
      </div>
    </div>
  )
}
