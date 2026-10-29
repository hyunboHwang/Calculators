import { useMemo, useState } from 'react'
import { calcBmi } from '../lib/bmi'
import { Field, Row } from '../components/ui'

const CATEGORY_STYLE: Record<string, string> = {
  저체중: 'border-rule bg-tint text-body',
  정상: 'border-accent bg-tint text-accent',
  '비만 전단계(과체중)': 'border-rule bg-tint text-body',
  '1단계 비만': 'border-rule bg-tint text-body',
  '2단계 비만': 'border-accent bg-tint text-accent',
  '3단계 비만(고도비만)': 'border-accent bg-tint text-accent',
  '입력값을 확인하세요': 'border-rule bg-tint text-ink',
}

export default function BmiCalculator() {
  const [heightCm, setHeightCm] = useState(170)
  const [weightKg, setWeightKg] = useState(65)

  const r = useMemo(() => calcBmi({ heightCm, weightKg }), [heightCm, weightKg])

  return (
    <div>
      <h1 className="text-2xl font-bold">BMI·표준체중 계산기</h1>
      <p className="mt-1 mb-6 text-sm text-muted">
        키와 몸무게로 체질량지수(BMI)와 표준체중을 계산합니다. 대한비만학회 아시아·태평양 기준
        체중 구간을 사용합니다.
      </p>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <section className="h-fit border border-rule bg-paper p-5">
          <h2 className="mb-4 text-base font-semibold">신체 정보</h2>
          <div className="grid grid-cols-2 gap-x-3">
            <Field label="신장" value={heightCm} onChange={setHeightCm} suffix="cm" step={1} />
            <Field label="체중" value={weightKg} onChange={setWeightKg} suffix="kg" step={0.5} />
          </div>
        </section>

        <section className="space-y-4">
          {!Number.isFinite(r.bmi) ? (
            <div className="border border-rule bg-tint p-5 text-sm text-body">
              신장과 체중을 0보다 큰 값으로 입력하면 BMI를 계산합니다.
            </div>
          ) : (
            <>
              <div className={`border p-5 ${CATEGORY_STYLE[r.category]}`}>
                <p className="text-sm opacity-80">BMI</p>
                <p className="text-3xl font-bold font-serif tabular-nums">{r.bmi.toFixed(1)}</p>
                <p className="mt-2 text-sm font-semibold">{r.category}</p>
              </div>

              <div className="border border-rule bg-paper p-5">
                <h2 className="mb-2 text-base font-semibold">상세</h2>
                <div className="divide-y divide-rule">
                  <Row label="표준체중" value={`${r.standardWeight}kg`} sub="신장²×22" />
                  <Row
                    label="표준체중과의 차이"
                    value={`${r.diffFromStandard > 0 ? '+' : ''}${r.diffFromStandard}kg`}
                    negative={r.diffFromStandard > 0}
                  />
                </div>
              </div>
            </>
          )}

          <div className="border border-rule bg-tint p-4 text-xs leading-relaxed text-body">
            <b>이 계산은 참고용입니다.</b> BMI는 근육량·체지방률을 구분하지 않으므로 운동선수
            등은 실제 체지방률과 다르게 나올 수 있습니다.
          </div>
        </section>
      </div>
    </div>
  )
}
