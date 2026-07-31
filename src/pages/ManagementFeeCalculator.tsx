import { useMemo, useState } from 'react'
import { Field, Row, fmt } from '../components/ui'

export default function ManagementFeeCalculator() {
  const [exclusiveArea, setExclusiveArea] = useState(84)
  const [commonManagementFee, setCommonManagementFee] = useState(150_000)
  const [longTermRepairReserve, setLongTermRepairReserve] = useState(20_000)
  const [electricity, setElectricity] = useState(50_000)
  const [water, setWater] = useState(15_000)
  const [gas, setGas] = useState(30_000)
  const [heating, setHeating] = useState(40_000)
  const [misc, setMisc] = useState(10_000)

  const r = useMemo(() => {
    const totalFee =
      commonManagementFee + longTermRepairReserve + electricity + water + gas + heating + misc
    const feePerArea = exclusiveArea > 0 ? totalFee / exclusiveArea : 0
    return { totalFee, feePerArea }
  }, [exclusiveArea, commonManagementFee, longTermRepairReserve, electricity, water, gas, heating, misc])

  return (
    <div>
      <h1 className="text-2xl font-bold">관리비 계산기</h1>
      <p className="mt-1 mb-6 text-sm text-slate-500">
        아파트 관리비 고지서 항목을 입력하면 총 관리비와 전용면적당 관리비를 계산합니다.
      </p>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <section className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-base font-semibold">관리비 항목 입력</h2>
          <div className="space-y-4">
            <Field label="전용면적" value={exclusiveArea} onChange={setExclusiveArea} suffix="㎡" step={1} />
            <Field
              label="공용관리비"
              value={commonManagementFee}
              onChange={setCommonManagementFee}
              step={10_000}
              hint="일반관리비·청소비·경비비·소독비·승강기유지비 합산"
            />
            <Field
              label="장기수선충당금"
              value={longTermRepairReserve}
              onChange={setLongTermRepairReserve}
              step={10_000}
            />
            <Field label="전기료" value={electricity} onChange={setElectricity} step={10_000} />
            <Field label="수도료" value={water} onChange={setWater} step={10_000} />
            <Field label="가스료" value={gas} onChange={setGas} step={10_000} />
            <Field label="난방·급탕비" value={heating} onChange={setHeating} step={10_000} />
            <Field label="기타" value={misc} onChange={setMisc} step={10_000} hint="TV수신료, 정화조 등" />
          </div>
        </section>

        <section className="space-y-4">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
            <p className="text-sm text-slate-500">총 관리비</p>
            <p className="text-3xl font-extrabold tabular-nums text-emerald-700">{fmt(r.totalFee)}원</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-2 text-base font-semibold">전용면적당 관리비</h2>
            <div className="divide-y divide-slate-100">
              <Row label="㎡당 관리비" value={`${fmt(r.feePerArea)}원/㎡`} strong />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs leading-relaxed text-slate-500">
            이 계산기는 입력한 항목의 합계만 계산합니다. 실제 고지서의 항목 구성은 단지마다 다를
            수 있으니, 고지서의 세부 항목을 위 카테고리에 맞춰 합산해 입력하세요.
          </div>
        </section>
      </div>
    </div>
  )
}
