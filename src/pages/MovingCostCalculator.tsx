import { useMemo, useState } from 'react'
import { Field, fmt } from '../components/ui'

export default function MovingCostCalculator() {
  const [ladderTruckCost, setLadderTruckCost] = useState(150_000)
  const [movingServiceCost, setMovingServiceCost] = useState(800_000)
  const [cleaningCost, setCleaningCost] = useState(100_000)
  const [applianceInstallCost, setApplianceInstallCost] = useState(150_000)
  const [wasteDisposalCost, setWasteDisposalCost] = useState(50_000)
  const [miscCost, setMiscCost] = useState(50_000)

  const r = useMemo(() => {
    const totalCost =
      ladderTruckCost + movingServiceCost + cleaningCost + applianceInstallCost + wasteDisposalCost + miscCost
    return { totalCost }
  }, [ladderTruckCost, movingServiceCost, cleaningCost, applianceInstallCost, wasteDisposalCost, miscCost])

  return (
    <div>
      <h1 className="text-2xl font-bold">이사비용 계산기</h1>
      <p className="mt-1 mb-6 text-sm text-slate-500">
        이사에 드는 비용 항목을 입력하면 총 이사비용을 계산합니다.
      </p>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <section className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-base font-semibold">이사비용 항목 입력</h2>
          <div className="space-y-4">
            <Field label="사다리차 비용" value={ladderTruckCost} onChange={setLadderTruckCost} step={10_000} />
            <Field
              label="포장이사·일반이사 용역비"
              value={movingServiceCost}
              onChange={setMovingServiceCost}
              step={10_000}
            />
            <Field label="청소비" value={cleaningCost} onChange={setCleaningCost} step={10_000} />
            <Field
              label="가전 이전설치비"
              value={applianceInstallCost}
              onChange={setApplianceInstallCost}
              step={10_000}
              hint="에어컨, 정수기 등"
            />
            <Field label="폐기물 처리비" value={wasteDisposalCost} onChange={setWasteDisposalCost} step={10_000} />
            <Field label="기타 비용" value={miscCost} onChange={setMiscCost} step={10_000} />
          </div>
        </section>

        <section className="space-y-4">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
            <p className="text-sm text-slate-500">총 이사비용</p>
            <p className="text-3xl font-extrabold tabular-nums text-emerald-700">{fmt(r.totalCost)}원</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs leading-relaxed text-slate-500">
            이 계산기는 입력한 항목의 합계만 계산하며, 실제 이사비용 시세를 제공하지 않습니다.
            각 항목은 견적받은 금액이나 예상 비용을 직접 입력하세요.
          </div>
        </section>
      </div>
    </div>
  )
}
