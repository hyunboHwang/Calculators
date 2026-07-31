import { useMemo, useState } from 'react'
import { calcSubscriptionScore } from '../lib/subscriptionScore'
import { Field, DateField, Row } from '../components/ui'

export default function SubscriptionScoreCalculator() {
  const [noHouseSinceDate, setNoHouseSinceDate] = useState('2015-01-01')
  const [dependentsCount, setDependentsCount] = useState(2)
  const [subscriptionJoinDate, setSubscriptionJoinDate] = useState('2018-01-01')
  const [hasSpouseSubscription, setHasSpouseSubscription] = useState(false)
  const [spouseSubscriptionJoinDate, setSpouseSubscriptionJoinDate] = useState('2020-01-01')

  const r = useMemo(
    () =>
      calcSubscriptionScore(
        {
          noHouseSinceDate,
          dependentsCount,
          subscriptionJoinDate,
          spouseSubscriptionJoinDate: hasSpouseSubscription ? spouseSubscriptionJoinDate : undefined,
        },
        new Date(),
      ),
    [noHouseSinceDate, dependentsCount, subscriptionJoinDate, hasSpouseSubscription, spouseSubscriptionJoinDate],
  )

  return (
    <div>
      <h1 className="text-2xl font-bold">청약가점 계산기</h1>
      <p className="mt-1 mb-6 text-sm text-slate-500">
        민영주택 일반공급 청약가점(84점 만점)을 무주택기간·부양가족수·청약통장 가입기간으로
        계산합니다.
      </p>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <section className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-base font-semibold">가점 항목 입력</h2>
          <div className="space-y-4">
            <DateField
              label="무주택 인정 시작일"
              value={noHouseSinceDate}
              onChange={setNoHouseSinceDate}
              hint="만 30세 도달일과 혼인신고일 중 빠른 날. 이후 주택을 소유한 적이 있다면 마지막으로 무주택자가 된 날"
            />
            <Field
              label="부양가족 수"
              value={dependentsCount}
              onChange={(v) => setDependentsCount(Math.max(0, Math.round(v)))}
              suffix="명"
              step={1}
              hint="본인 제외"
            />
            <DateField
              label="청약통장 가입일"
              value={subscriptionJoinDate}
              onChange={setSubscriptionJoinDate}
            />
            <div className="rounded-xl bg-slate-50 p-3">
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={hasSpouseSubscription}
                  onChange={(e) => setHasSpouseSubscription(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 accent-emerald-600"
                />
                배우자 명의 청약통장 있음 (최대 3점 합산)
              </label>
            </div>
            {hasSpouseSubscription && (
              <DateField
                label="배우자 청약통장 가입일"
                value={spouseSubscriptionJoinDate}
                onChange={setSpouseSubscriptionJoinDate}
              />
            )}
          </div>
        </section>

        <section className="space-y-4">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
            <p className="text-sm text-slate-500">청약가점 총점 (84점 만점)</p>
            <p className="text-3xl font-extrabold tabular-nums text-emerald-700">{r.totalScore}점</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-2 text-base font-semibold">항목별 점수</h2>
            <div className="divide-y divide-slate-100">
              <Row label="무주택기간 (32점 만점)" value={`${r.noHouseScore}점`} />
              <Row label="부양가족수 (35점 만점)" value={`${r.dependentsScore}점`} />
              <Row label="청약통장 가입기간 (17점 만점)" value={`${r.subscriptionScore}점`} strong />
            </div>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-relaxed text-amber-800">
            <b>이 계산은 예상치입니다.</b> 무주택세대구성원 자격 자체(배우자를 포함한 세대 전원의
            무주택 여부 등)는 검증하지 않았습니다. 정확한 자격과 가점은 청약홈에서 확인하세요.
          </div>
        </section>
      </div>
    </div>
  )
}
