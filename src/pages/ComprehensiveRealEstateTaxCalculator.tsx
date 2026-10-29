import { useMemo, useState } from 'react'
import { calcComprehensiveRealEstateTax, getComprehensiveRealEstateTaxVerdict } from '../lib/comprehensiveRealEstateTax'
import { Field, Row, fmt } from '../components/ui'
import VerdictBanner from '../components/VerdictBanner'

export default function ComprehensiveRealEstateTaxCalculator() {
  const [totalPublicPrice, setTotalPublicPrice] = useState(1_500_000_000)
  const [isSingleHouse, setIsSingleHouse] = useState(true)
  const [ownership, setOwnership] = useState<'sole' | 'jointSpecial' | 'jointEach'>('sole')
  const [age, setAge] = useState(0)
  const [holdYears, setHoldYears] = useState(0)

  const r = useMemo(
    () => calcComprehensiveRealEstateTax({ totalPublicPrice, isSingleHouse, ownership, age, holdYears }),
    [totalPublicPrice, isSingleHouse, ownership, age, holdYears],
  )

  const verdict = useMemo(
    () => getComprehensiveRealEstateTaxVerdict({ totalPublicPrice, isSingleHouse, ownership, age, holdYears }, r),
    [totalPublicPrice, isSingleHouse, ownership, age, holdYears, r],
  )

  return (
    <div>
      <h1 className="text-2xl font-bold">종합부동산세 계산기</h1>
      <p className="mt-1 mb-6 text-sm text-muted">
        인별 공시가격 합산액 기준으로 종합부동산세와 농어촌특별세를 계산합니다. 다주택
        중과세율과 세부담 상한은 반영하지 않은 일반세율 기준 추정치입니다.
      </p>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <section className="h-fit border border-rule bg-paper p-5">
          <h2 className="mb-4 text-base font-semibold">보유 주택 정보</h2>
          <div className="space-y-4">
            <Field
              label="공시가격 합산액"
              value={totalPublicPrice}
              onChange={setTotalPublicPrice}
              step={10_000_000}
              hint="본인 명의 모든 주택 공시가격 합계"
            />
            <div className="bg-tint p-3">
              <label className="flex items-center gap-2 text-sm text-ink">
                <input
                  type="checkbox"
                  checked={isSingleHouse}
                  onChange={(e) => setIsSingleHouse(e.target.checked)}
                  className="h-4 w-4 rounded border-rule accent-ink"
                />
                1세대1주택자 (기본공제 12억)
              </label>
            </div>
            {isSingleHouse && (
              <div className="bg-tint p-3">
                <label className="text-sm text-ink">
                  소유 형태
                  <select
                    value={ownership}
                    onChange={(e) => setOwnership(e.target.value as typeof ownership)}
                    className="mt-1 w-full border border-rule bg-paper p-2"
                  >
                    <option value="sole">단독명의 (12억 공제)</option>
                    <option value="jointSpecial">공동명의 + 1주택 특례 신청 (12억 공제)</option>
                    <option value="jointEach">공동명의, 특례 미신청 (인별 9억씩, 지분 50:50 가정)</option>
                  </select>
                </label>
                {ownership === 'jointEach' && (
                  <p className="mt-2 text-xs text-muted">
                    인별 9억 공제 방식은 고령자·장기보유 세액공제를 받을 수 없습니다. 특례 신청은 해당
                    연도 9월 16일~30일 관할 세무서에 합니다.
                  </p>
                )}
              </div>
            )}
            {isSingleHouse && ownership !== 'jointEach' && (
              <div className="grid gap-3 bg-tint p-3 sm:grid-cols-2">
                <label className="text-sm text-ink">
                  만 나이 (고령자 공제)
                  <select
                    value={age}
                    onChange={(e) => setAge(Number(e.target.value))}
                    className="mt-1 w-full border border-rule bg-paper p-2"
                  >
                    <option value={0}>60세 미만 (공제 없음)</option>
                    <option value={60}>60~64세 (20%)</option>
                    <option value={65}>65~69세 (30%)</option>
                    <option value={70}>70세 이상 (40%)</option>
                  </select>
                </label>
                <label className="text-sm text-ink">
                  보유기간 (장기보유 공제)
                  <select
                    value={holdYears}
                    onChange={(e) => setHoldYears(Number(e.target.value))}
                    className="mt-1 w-full border border-rule bg-paper p-2"
                  >
                    <option value={0}>5년 미만 (공제 없음)</option>
                    <option value={5}>5~9년 (20%)</option>
                    <option value={10}>10~14년 (40%)</option>
                    <option value={15}>15년 이상 (50%)</option>
                  </select>
                </label>
                <p className="text-xs text-muted sm:col-span-2">
                  단독명의 또는 공동명의 특례 신청 1세대1주택자에게 적용하며 두 공제율의 합은 80%까지입니다.
                  공동명의 특례는 합의로 정한 1인의 나이·보유기간을 기준으로 합니다.
                </p>
              </div>
            )}
          </div>
        </section>

        <section className="space-y-4">
          <VerdictBanner verdict={verdict} />

          <div className="border border-rule bg-paper p-5">
            <h2 className="mb-2 text-base font-semibold">상세 내역</h2>
            <div className="divide-y divide-rule">
              <Row label={r.persons > 1 ? '과세표준 (1인당)' : '과세표준'} value={`${fmt(r.taxBase)}원`} />
              {isSingleHouse && ownership !== 'jointEach' && (
                <>
                  <Row label="공제 전 종합부동산세" value={`${fmt(r.taxBeforeCredit)}원`} />
                  <Row label="고령자 공제율" value={`${Math.round(r.ageRate * 100)}%`} />
                  <Row label="장기보유 공제율" value={`${Math.round(r.holdRate * 100)}%`} />
                  <Row label="합산 공제율 (한도 80%)" value={`${Math.round(r.creditRate * 100)}%`} />
                  <Row label="세액공제액" value={`-${fmt(r.creditAmount)}원`} />
                </>
              )}
              <Row label={isSingleHouse && ownership !== 'jointEach' ? '공제 후 종합부동산세' : '종합부동산세'} value={`${fmt(r.comprehensiveTax)}원`} strong />
              <Row label="농어촌특별세" value={`${fmt(r.ruralSpecialTax)}원`} />
              <Row label="합계" value={`${fmt(r.total)}원`} strong />
            </div>
          </div>

          <div className="border border-rule bg-tint p-4 text-xs leading-relaxed text-body">
            <b>이 계산은 예상치입니다.</b> 3주택 이상 중과세율, 세부담 상한, 재산세 중복분
            공제는 반영하지 않았습니다. 고령자·장기보유 세액공제(합산 최대 80%)는 단독명의 또는
            공동명의 특례를 신청한 1세대1주택자에게 적용하며, 법상 재산세 중복분을 뺀 산출세액에 공제율을 곱하나
            여기서는 재산세 중복분을 빼지 않은 세액에 곱하므로 실제 공제액과 다를 수 있습니다.
            공동명의 인별 9억 공제 방식은 세액공제 대상이 아니며 지분을 50:50으로 가정합니다. 정확한 세액은 국세청
            홈택스에서 확인하세요.
          </div>
        </section>
      </div>
    </div>
  )
}
