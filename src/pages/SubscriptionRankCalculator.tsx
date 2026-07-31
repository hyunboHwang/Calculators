import { useMemo, useState } from 'react'
import { calcSubscriptionRank, type RegionType } from '../lib/subscriptionRank'
import { Field, DateField, Row, fmt } from '../components/ui'

const REGION_LABELS: Record<RegionType, string> = {
  speculation: '투기과열지구·조정대상지역',
  metro: '수도권 (그 외 지역)',
  nonMetro: '비수도권',
  shrinking: '위축지역',
}

export default function SubscriptionRankCalculator() {
  const [allHouseholdNoHouse, setAllHouseholdNoHouse] = useState(true)
  const [isHouseholdHead, setIsHouseholdHead] = useState(true)
  const [wonInLast5Years, setWonInLast5Years] = useState(false)
  const [regionType, setRegionType] = useState<RegionType>('metro')
  const [subscriptionJoinDate, setSubscriptionJoinDate] = useState('2020-01-01')
  const [paymentCount, setPaymentCount] = useState(24)
  const [totalSavings, setTotalSavings] = useState(10_000_000)
  const [unitSizeOver40, setUnitSizeOver40] = useState(false)

  const r = useMemo(
    () =>
      calcSubscriptionRank(
        {
          allHouseholdNoHouse,
          isHouseholdHead,
          wonInLast5Years,
          regionType,
          subscriptionJoinDate,
          paymentCount,
          totalSavings,
          unitSizeOver40,
        },
        new Date(),
      ),
    [
      allHouseholdNoHouse,
      isHouseholdHead,
      wonInLast5Years,
      regionType,
      subscriptionJoinDate,
      paymentCount,
      totalSavings,
      unitSizeOver40,
    ],
  )

  return (
    <div>
      <h1 className="text-2xl font-bold">청약순위 계산기</h1>
      <p className="mt-1 mb-6 text-sm text-slate-500">
        국민주택(공공분양) 1순위·2순위 요건과 순차제(저축총액·납입횟수) 비교 기준을
        확인합니다.
      </p>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <section className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-base font-semibold">청약 조건 입력</h2>
          <div className="space-y-4">
            <div className="rounded-xl bg-slate-50 p-3">
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={allHouseholdNoHouse}
                  onChange={(e) => setAllHouseholdNoHouse(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 accent-emerald-600"
                />
                세대 전원 무주택
              </label>
            </div>
            <div>
              <span className="mb-1.5 block text-sm font-medium text-slate-700">청약 지역 유형</span>
              <select
                value={regionType}
                onChange={(e) => setRegionType(e.target.value as RegionType)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none"
              >
                {(Object.keys(REGION_LABELS) as RegionType[]).map((key) => (
                  <option key={key} value={key}>
                    {REGION_LABELS[key]}
                  </option>
                ))}
              </select>
            </div>
            {regionType === 'speculation' && (
              <div className="space-y-3 rounded-xl bg-slate-50 p-3">
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={isHouseholdHead}
                    onChange={(e) => setIsHouseholdHead(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 accent-emerald-600"
                  />
                  세대주임
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={wonInLast5Years}
                    onChange={(e) => setWonInLast5Years(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 accent-emerald-600"
                  />
                  최근 5년 이내 세대구성원 당첨 이력 있음
                </label>
              </div>
            )}
            <DateField
              label="청약통장 가입일"
              value={subscriptionJoinDate}
              onChange={setSubscriptionJoinDate}
            />
            <Field
              label="납입 횟수"
              value={paymentCount}
              onChange={(v) => setPaymentCount(Math.max(0, Math.round(v)))}
              suffix="회"
              step={1}
            />
            <Field
              label="저축총액"
              value={totalSavings}
              onChange={setTotalSavings}
              step={100_000}
              hint="청약홈 나의 청약통장 정보 기준 실제 저축총액"
            />
            <div className="rounded-xl bg-slate-50 p-3">
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={unitSizeOver40}
                  onChange={(e) => setUnitSizeOver40(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 accent-emerald-600"
                />
                희망 평형 전용 40㎡ 초과
              </label>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          {r.eligible ? (
            <>
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
                <p className="text-sm text-slate-500">청약 순위</p>
                <p className="text-3xl font-extrabold tabular-nums text-emerald-700">{r.rank}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="mb-2 text-base font-semibold">순차제 비교 기준</h2>
                <div className="divide-y divide-slate-100">
                  <Row label="비교 기준" value={r.sequencingBasis} />
                  <Row
                    label={r.sequencingBasis === '저축총액' ? '저축총액' : '납입 횟수'}
                    value={r.sequencingBasis === '저축총액' ? `${fmt(r.sequencingValue)}원` : `${r.sequencingValue}회`}
                    strong
                  />
                </div>
              </div>
            </>
          ) : (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
              <p className="text-sm text-slate-500">판정 결과</p>
              <p className="text-xl font-bold text-red-700">{r.reason}</p>
            </div>
          )}

          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-relaxed text-amber-800">
            <b>이 계산은 예상치입니다.</b> 재당첨제한(지역별 5~10년 별도 제도)은 반영하지
            않았습니다. 투기과열지구·조정대상지역 지정 현황은 수시로 바뀌므로 청약홈에서 최종
            확인하세요.
          </div>
        </section>
      </div>
    </div>
  )
}
