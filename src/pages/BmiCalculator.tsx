import { useMemo, useState } from 'react'
import { calcBmi } from '../lib/bmi'
import { Field, Row } from '../components/ui'

const CATEGORY_STYLE: Record<string, string> = {
  저체중: 'border-sky-200 bg-sky-50 text-sky-700',
  정상: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  과체중: 'border-amber-200 bg-amber-50 text-amber-700',
  비만: 'border-orange-200 bg-orange-50 text-orange-700',
  고도비만: 'border-red-200 bg-red-50 text-red-700',
}

export default function BmiCalculator() {
  const [heightCm, setHeightCm] = useState(170)
  const [weightKg, setWeightKg] = useState(65)

  const r = useMemo(() => calcBmi({ heightCm, weightKg }), [heightCm, weightKg])

  return (
    <div>
      <h1 className="text-2xl font-bold">BMI·표준체중 계산기</h1>
      <p className="mt-1 mb-6 text-sm text-slate-500">
        키와 몸무게로 체질량지수(BMI)와 표준체중을 계산합니다. 대한비만학회 아시아·태평양 기준
        체중 구간을 사용합니다.
      </p>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <section className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-base font-semibold">신체 정보</h2>
          <div className="grid grid-cols-2 gap-x-3">
            <Field label="신장" value={heightCm} onChange={setHeightCm} suffix="cm" step={1} />
            <Field label="체중" value={weightKg} onChange={setWeightKg} suffix="kg" step={0.5} />
          </div>
        </section>

        <section className="space-y-4">
          <div className={`rounded-2xl border p-5 ${CATEGORY_STYLE[r.category]}`}>
            <p className="text-sm opacity-80">BMI</p>
            <p className="text-3xl font-extrabold tabular-nums">{r.bmi.toFixed(1)}</p>
            <p className="mt-2 text-sm font-semibold">{r.category}</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-2 text-base font-semibold">상세</h2>
            <div className="divide-y divide-slate-100">
              <Row label="표준체중" value={`${r.standardWeight}kg`} sub="신장²×22" />
              <Row
                label="표준체중과의 차이"
                value={`${r.diffFromStandard > 0 ? '+' : ''}${r.diffFromStandard}kg`}
                negative={r.diffFromStandard > 0}
              />
            </div>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-relaxed text-amber-800">
            <b>이 계산은 참고용입니다.</b> BMI는 근육량·체지방률을 구분하지 않으므로 운동선수
            등은 실제 체지방률과 다르게 나올 수 있습니다.
          </div>
        </section>
      </div>
    </div>
  )
}
