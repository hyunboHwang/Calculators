import { useMemo, useState } from 'react'
import { calcCarTax } from '../lib/carTax'
import { Field, Row, fmt } from '../components/ui'

export default function CarTaxCalculator() {
  const [displacement, setDisplacement] = useState(1998)
  const [yearsElapsed, setYearsElapsed] = useState(5)
  const [isElectric, setIsElectric] = useState(false)

  const r = useMemo(
    () => calcCarTax({ displacement, yearsElapsed, isElectric }),
    [displacement, yearsElapsed, isElectric],
  )

  return (
    <div>
      <h1 className="text-2xl font-bold">자동차세 계산기</h1>
      <p className="mt-1 mb-6 text-sm text-slate-500">
        배기량과 차령(경과연수)으로 비영업용 승용차의 연간 자동차세를 계산합니다. 차령 3년차부터
        매년 5%p씩, 최대 50%까지 감경됩니다.
      </p>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <section className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-base font-semibold">차량 정보</h2>
          <div className="space-y-4">
            <div className="rounded-xl bg-slate-50 p-3">
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={isElectric}
                  onChange={(e) => setIsElectric(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 accent-emerald-600"
                />
                전기차 (정액 10만원)
              </label>
            </div>
            {!isElectric && (
              <>
                <Field
                  label="배기량"
                  value={displacement}
                  onChange={setDisplacement}
                  suffix="cc"
                  step={100}
                />
                <Field
                  label="차령"
                  value={yearsElapsed}
                  onChange={setYearsElapsed}
                  suffix="년"
                  step={1}
                  hint="신차는 0"
                />
              </>
            )}
          </div>
        </section>

        <section className="space-y-4">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
            <p className="text-sm text-slate-500">예상 연간 총액</p>
            <p className="text-3xl font-extrabold tabular-nums text-emerald-700">
              {fmt(r.total)}원
            </p>
            {r.depreciationPct > 0 && (
              <p className="mt-2 text-sm text-slate-600">경년 감경 {r.depreciationPct}% 적용</p>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-2 text-base font-semibold">상세 내역</h2>
            <div className="divide-y divide-slate-100">
              <Row label="자동차세" value={`${fmt(r.carTax)}원`} strong />
              <Row label="지방교육세" value={`${fmt(r.localEduTax)}원`} />
              <Row label="합계" value={`${fmt(r.total)}원`} strong />
            </div>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-relaxed text-amber-800">
            <b>이 계산은 예상치입니다.</b> 연납 신청 시 받을 수 있는 할인은 반영하지
            않았습니다. 실제 고지 세액은 위택스(wetax.go.kr)에서 확인하세요.
          </div>
        </section>
      </div>
    </div>
  )
}
