import { useMemo, useState } from 'react'
import { calcAcquisitionTax, type HouseCount } from '../lib/acquisitionTax'
import { Field, Row, fmt, Result } from '../components/ui'

const HOUSE_COUNT_LABEL: Record<HouseCount, string> = {
  first: '1주택',
  second: '2주택',
  third: '3주택',
  fourthPlus: '4주택 이상',
}

export default function AcquisitionTaxCalculator() {
  const [price, setPrice] = useState(500_000_000)
  const [houseCount, setHouseCount] = useState<HouseCount>('first')
  const [isAdjusted, setIsAdjusted] = useState(false)
  const [areaOver85, setAreaOver85] = useState(false)

  const r = useMemo(
    () => calcAcquisitionTax({ price, houseCount, isAdjusted, areaOver85 }),
    [price, houseCount, isAdjusted, areaOver85],
  )

  return (
    <div>
      <h1 className="text-2xl font-bold">취득세 계산기</h1>
      <p className="mt-1 mb-6 text-sm text-muted">
        주택 유상취득 시 취득세·지방교육세·농어촌특별세를 계산합니다. 취득 후 주택 수(이번 취득 포함)와
        조정대상지역 여부에 따라 세율이 크게 달라집니다.
      </p>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <section className="h-fit border border-rule bg-paper p-5">
          <h2 className="mb-4 text-base font-semibold">취득 정보</h2>
          <div className="space-y-4">
            <Field label="취득가액" value={price} onChange={setPrice} step={10_000_000} />

            <div>
              <span className="mb-1.5 block text-sm font-medium text-ink">취득 후 주택 수 (이번 취득 포함)</span>
              <div className="flex gap-1.5">
                {(Object.keys(HOUSE_COUNT_LABEL) as HouseCount[]).map((h) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => setHouseCount(h)}
                    className={`flex-1 border px-2 py-2 text-xs font-medium transition-colors ${
                      houseCount === h
                        ? 'border-ink bg-ink text-paper'
                        : 'border-ink text-ink hover:bg-tint'
                    }`}
                  >
                    {HOUSE_COUNT_LABEL[h]}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2 bg-tint p-3">
              <label className="flex items-center gap-2 text-sm text-ink">
                <input
                  type="checkbox"
                  checked={isAdjusted}
                  onChange={(e) => setIsAdjusted(e.target.checked)}
                  className="h-4 w-4 rounded border-rule accent-ink"
                />
                조정대상지역
              </label>
              <label className="flex items-center gap-2 text-sm text-ink">
                <input
                  type="checkbox"
                  checked={areaOver85}
                  onChange={(e) => setAreaOver85(e.target.checked)}
                  className="h-4 w-4 rounded border-rule accent-ink"
                />
                전용면적 85㎡ 초과
              </label>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="border border-accent bg-tint p-5">
            <Result label="예상 총 납부액" value={fmt(r.total)} unit="원" />
            <p className="mt-2 text-sm text-body">적용 세율 {r.rate.toFixed(2)}%</p>
          </div>

          <div className="border border-rule bg-paper p-5">
            <h2 className="mb-2 text-base font-semibold">상세 내역</h2>
            <div className="divide-y divide-rule">
              <Row label="취득세" value={`${fmt(r.acquisitionTax)}원`} strong />
              <Row label="지방교육세" value={`${fmt(r.localEduTax)}원`} />
              <Row
                label="농어촌특별세"
                value={`${fmt(r.ruralSpecialTax)}원`}
                sub={areaOver85 ? undefined : '85㎡ 이하 면제'}
              />
              <Row label="합계" value={`${fmt(r.total)}원`} strong />
            </div>
          </div>

          <div className="border border-rule bg-tint p-4 text-xs leading-relaxed text-body">
            <b>이 계산은 예상치입니다.</b> 일시적 2주택, 생애최초 감면, 지역별 세부 고시에 따라
            실제 세액이 달라질 수 있습니다. 정확한 세액은 위택스(wetax.go.kr)에서 확인하세요.
          </div>
        </section>
      </div>
    </div>
  )
}
