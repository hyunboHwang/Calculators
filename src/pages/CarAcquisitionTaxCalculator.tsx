import { useMemo, useState } from 'react'
import { calcCarAcquisitionTax, type VehicleType } from '../lib/carAcquisitionTax'
import { Field, fmt } from '../components/ui'

const VEHICLE_TYPE_LABEL: Record<VehicleType, string> = {
  nonBusiness: '비영업용 승용',
  business: '영업용',
  lightCar: '경차',
}

export default function CarAcquisitionTaxCalculator() {
  const [price, setPrice] = useState(30_000_000)
  const [vehicleType, setVehicleType] = useState<VehicleType>('nonBusiness')

  const r = useMemo(() => calcCarAcquisitionTax({ price, vehicleType }), [price, vehicleType])

  return (
    <div>
      <h1 className="text-2xl font-bold">자동차 취득세 계산기</h1>
      <p className="mt-1 mb-6 text-sm text-slate-500">
        차량가액과 차종으로 자동차 취득세를 계산합니다.
      </p>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <section className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-base font-semibold">차량 정보</h2>
          <div className="space-y-4">
            <Field label="차량가액" value={price} onChange={setPrice} step={1_000_000} />
            <div>
              <span className="mb-1.5 block text-sm font-medium text-slate-700">차종</span>
              <div className="flex gap-1.5">
                {(Object.keys(VEHICLE_TYPE_LABEL) as VehicleType[]).map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setVehicleType(v)}
                    className={`flex-1 rounded-lg border px-2 py-2 text-xs font-medium transition-colors ${
                      vehicleType === v
                        ? 'border-emerald-600 bg-emerald-600 text-white'
                        : 'border-slate-300 text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    {VEHICLE_TYPE_LABEL[v]}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
            <p className="text-sm text-slate-500">예상 취득세</p>
            <p className="text-3xl font-extrabold tabular-nums text-emerald-700">
              {fmt(r.tax)}원
            </p>
            <p className="mt-2 text-sm text-slate-600">적용 세율 {r.rate}%</p>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-relaxed text-amber-800">
            <b>이 계산은 예상치입니다.</b> 경차 감면 한도, 다자녀·친환경차 감면 등 세부 감면은
            반영하지 않았습니다. 정확한 세액은 위택스(wetax.go.kr)에서 확인하세요.
          </div>
        </section>
      </div>
    </div>
  )
}
