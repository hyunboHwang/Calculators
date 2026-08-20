import { useMemo, useState } from 'react'
import { calcPropertyTax, getPropertyTaxVerdict } from '../lib/propertyTax'
import { Field, Row, fmt } from '../components/ui'
import VerdictBanner from '../components/VerdictBanner'

export default function PropertyTaxCalculator() {
  const [publicPrice, setPublicPrice] = useState(500_000_000)
  const [isSingleHouse, setIsSingleHouse] = useState(true)

  const r = useMemo(
    () => calcPropertyTax({ publicPrice, isSingleHouse }),
    [publicPrice, isSingleHouse],
  )
  const verdict = useMemo(() => getPropertyTaxVerdict({ publicPrice, isSingleHouse }, r), [publicPrice, isSingleHouse, r])

  return (
    <div>
      <h1 className="text-2xl font-bold">재산세 계산기</h1>
      <p className="mt-1 mb-6 text-sm text-slate-500">
        공시가격 기준으로 재산세·도시지역분·지방교육세를 계산합니다. 1세대1주택자는 공시가격
        9억원 이하일 때 특례세율이 적용됩니다.
      </p>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <section className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-base font-semibold">주택 정보</h2>
          <div className="space-y-4">
            <Field
              label="공시가격"
              value={publicPrice}
              onChange={setPublicPrice}
              step={10_000_000}
            />
            <div className="rounded-xl bg-slate-50 p-3">
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={isSingleHouse}
                  onChange={(e) => setIsSingleHouse(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 accent-emerald-600"
                />
                1세대1주택자
              </label>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <VerdictBanner verdict={verdict} />

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-2 text-base font-semibold">상세 내역</h2>
            <div className="divide-y divide-slate-100">
              <Row label="과세표준" value={`${fmt(r.taxBase)}원`} />
              <Row label="재산세" value={`${fmt(r.propertyTax)}원`} strong />
              <Row label="도시지역분" value={`${fmt(r.urbanTax)}원`} />
              <Row label="지방교육세" value={`${fmt(r.localEduTax)}원`} />
              <Row label="합계" value={`${fmt(r.total)}원`} strong />
            </div>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-relaxed text-amber-800">
            <b>이 계산은 예상치입니다.</b> 세부담 상한, 지자체별 감면 조례 등은 반영하지
            않았습니다. 정확한 세액은 위택스(wetax.go.kr) 고지서를 확인하세요.
          </div>
        </section>
      </div>
    </div>
  )
}
