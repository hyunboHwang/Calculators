import { useMemo, useState } from 'react'
import { calcComprehensiveRealEstateTax } from '../lib/comprehensiveRealEstateTax'
import { Field, Row, fmt } from '../components/ui'

export default function ComprehensiveRealEstateTaxCalculator() {
  const [totalPublicPrice, setTotalPublicPrice] = useState(1_500_000_000)
  const [isSingleHouse, setIsSingleHouse] = useState(true)

  const r = useMemo(
    () => calcComprehensiveRealEstateTax({ totalPublicPrice, isSingleHouse }),
    [totalPublicPrice, isSingleHouse],
  )

  return (
    <div>
      <h1 className="text-2xl font-bold">종합부동산세 계산기</h1>
      <p className="mt-1 mb-6 text-sm text-slate-500">
        인별 공시가격 합산액 기준으로 종합부동산세와 농어촌특별세를 계산합니다. 다주택
        중과세율과 세부담 상한은 반영하지 않은 일반세율 기준 추정치입니다.
      </p>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <section className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-base font-semibold">보유 주택 정보</h2>
          <div className="space-y-4">
            <Field
              label="공시가격 합산액"
              value={totalPublicPrice}
              onChange={setTotalPublicPrice}
              step={10_000_000}
              hint="본인 명의 모든 주택 공시가격 합계"
            />
            <div className="rounded-xl bg-slate-50 p-3">
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={isSingleHouse}
                  onChange={(e) => setIsSingleHouse(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 accent-emerald-600"
                />
                1세대1주택자 (기본공제 12억)
              </label>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
            <p className="text-sm text-slate-500">예상 총 납부액</p>
            <p className="text-3xl font-extrabold tabular-nums text-emerald-700">
              {fmt(r.total)}원
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-2 text-base font-semibold">상세 내역</h2>
            <div className="divide-y divide-slate-100">
              <Row label="과세표준" value={`${fmt(r.taxBase)}원`} />
              <Row label="종합부동산세" value={`${fmt(r.comprehensiveTax)}원`} strong />
              <Row label="농어촌특별세" value={`${fmt(r.ruralSpecialTax)}원`} />
              <Row label="합계" value={`${fmt(r.total)}원`} strong />
            </div>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-relaxed text-amber-800">
            <b>이 계산은 예상치입니다.</b> 3주택 이상 중과세율, 세부담 상한, 재산세 중복분
            공제는 반영하지 않았습니다. 1세대1주택자 중 고령자·장기보유자는 세액공제(최대
            80%)로 실제 부담이 크게 줄어들 수 있습니다. 정확한 세액은 국세청 홈택스에서
            확인하세요.
          </div>
        </section>
      </div>
    </div>
  )
}
