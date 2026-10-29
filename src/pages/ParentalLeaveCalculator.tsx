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
      <p className="mt-1 mb-6 text-sm text-muted">
        2025년 개편 기준(사후지급금 폐지, 매월 전액 지급) 예상 육아휴직급여입니다.
      </p>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <section className="h-fit border border-rule bg-paper p-5">
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
              onChange={(v) => setLeaveMonths(Math.min(Math.max(0, Math.round(v)), 36))}
              suffix="개월"
              step={1}
              hint="최대 36개월까지 입력할 수 있습니다"
            />
          </div>
        </section>

        <section className="space-y-4">
          <div className="border border-accent bg-tint p-5">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-sm text-muted">총 육아휴직급여</p>
                <p className="text-3xl font-bold font-serif tabular-nums text-ink">
                  {fmt(r.total)}원
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted">월평균</p>
                <p className="text-lg font-bold tabular-nums">{fmt(r.average)}원</p>
              </div>
            </div>
            {(ordinaryWage > 2_500_000 || ordinaryWage > 2_000_000 || ordinaryWage * 0.8 > 1_600_000) && (
              <p className="mt-3 text-sm text-body">
                통상임금이 상한액을 넘는 구간은 상한으로 제한됩니다:
                {ordinaryWage > 2_500_000 && ' 1~3개월차 250만원'}
                {ordinaryWage > 2_000_000 && ' · 4~6개월차 200만원'}
                {ordinaryWage * 0.8 > 1_600_000 && ' · 7개월차~ 160만원(통상임금 80%가 상한 초과)'}
              </p>
            )}
          </div>

          <div className="border border-rule bg-paper p-5">
            <h2 className="mb-2 text-base font-semibold">구간별 지급액</h2>
            <div className="divide-y divide-rule">
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

          <div className="border border-rule bg-tint p-4 text-xs leading-relaxed text-body">
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
