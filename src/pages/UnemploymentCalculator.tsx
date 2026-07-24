import { useMemo, useState } from 'react'
import { calcUnemployment, UNEMPLOYMENT_2026, type InsuredPeriod } from '../lib/unemployment'
import { Field, Row, fmt } from '../components/ui'

const PERIOD_LABELS: Record<InsuredPeriod, string> = {
  '<1': '1년 미만',
  '1-3': '1년 이상 ~ 3년 미만',
  '3-5': '3년 이상 ~ 5년 미만',
  '5-10': '5년 이상 ~ 10년 미만',
  '10+': '10년 이상',
}

export default function UnemploymentCalculator() {
  const [monthlySalary, setMonthlySalary] = useState(3_000_000)
  const [insuredPeriod, setInsuredPeriod] = useState<InsuredPeriod>('1-3')
  const [isOlderOrDisabled, setIsOlderOrDisabled] = useState(false)

  const r = useMemo(
    () => calcUnemployment({ monthlySalary, insuredPeriod, isOlderOrDisabled }),
    [monthlySalary, insuredPeriod, isOlderOrDisabled],
  )

  return (
    <div>
      <h1 className="text-2xl font-bold">실업급여(구직급여) 계산기</h1>
      <p className="mt-1 mb-6 text-sm text-slate-500">
        비자발적 이직(권고사직·계약만료·폐업 등) 기준 예상 구직급여입니다.
      </p>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <section className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-base font-semibold">이직 정보 입력</h2>

          <Field
            label="이직 전 평균 월급여 (세전)"
            value={monthlySalary}
            onChange={setMonthlySalary}
            step={100_000}
            hint="최근 3개월 평균"
          />

          <div className="mt-4">
            <span className="mb-1 block text-sm font-medium text-slate-700">고용보험 가입기간</span>
            <div className="grid grid-cols-2 gap-1.5">
              {(Object.keys(PERIOD_LABELS) as InsuredPeriod[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setInsuredPeriod(p)}
                  className={`rounded-lg border px-2 py-2 text-xs font-medium transition-colors ${
                    insuredPeriod === p
                      ? 'border-emerald-600 bg-emerald-600 text-white'
                      : 'border-slate-300 text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  {PERIOD_LABELS[p]}
                </button>
              ))}
            </div>
          </div>

          <label className="mt-4 flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={isOlderOrDisabled}
              onChange={(e) => setIsOlderOrDisabled(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
            />
            이직일 기준 만 50세 이상 또는 장애인
          </label>
        </section>

        <section className="space-y-4">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
            <p className="text-sm text-slate-500">예상 총 구직급여</p>
            <p className="mt-1 text-3xl font-extrabold tabular-nums text-emerald-700">
              {fmt(r.totalBenefit)}원
            </p>
            <p className="mt-3 text-sm text-slate-600">
              1일 <b>{fmt(r.dailyBenefit)}원</b> × 소정급여일수 <b>{r.days}일</b>
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-2 text-base font-semibold">계산 내역</h2>
            <div className="divide-y divide-slate-100">
              <Row label="1일 평균임금" value={`${fmt(r.avgDailyWage)}원`} />
              <Row
                label="1일 구직급여액"
                value={`${fmt(r.dailyBenefit)}원`}
                sub={
                  r.isCapped
                    ? `상한액(${fmt(UNEMPLOYMENT_2026.upperDaily)}원) 적용`
                    : r.isFloored
                      ? `하한액(${fmt(UNEMPLOYMENT_2026.lowerDaily)}원) 적용`
                      : '평균임금의 60%'
                }
              />
              <Row label="소정급여일수" value={`${r.days}일`} />
              <Row label="월 환산 수급액" value={`${fmt(r.monthlyEquivalent)}원`} sub="1일 구직급여액 × 30일" />
              <Row label="총 구직급여" value={`${fmt(r.totalBenefit)}원`} strong />
            </div>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-relaxed text-amber-800">
            <b>이 계산은 예상치입니다.</b> 실업급여는 권고사직·계약만료·폐업·정년 등 비자발적
            이직이면서 이직 전 18개월간 고용보험 가입기간이 180일 이상이어야 대상이 됩니다.
            자발적 퇴사는 원칙적으로 지급 대상이 아니며(중대한 사유는 예외), 상한·하한액은
            매년 고용노동부 고시로 조정됩니다. 정확한 금액은 워크넷·고용센터에서 확인하세요.
          </div>
        </section>
      </div>
    </div>
  )
}
